/**
 * Cliente HTTP centralizado pra BrasilAPI.
 *
 * Responsabilidades:
 *   - Cache TTL em memória (default 24h). Dados públicos mudam pouco e a latência
 *     do round-trip impacta diretamente a UX do LLM (que pode chamar várias tools
 *     em sequência num único turno).
 *   - Retry com backoff exponencial (200/400/800ms). Só retentamos em 5xx, 429 e
 *     erros de rede — 4xx do cliente significa input ruim do usuário, retentar
 *     só piora a experiência (mais latência, mesmo erro).
 *   - Timeout via AbortController (default 10s). BrasilAPI ocasionalmente pendura
 *     conexões; sem timeout o canal MCP fica inutilizável.
 *   - Tradução de status HTTP em BrasilApiError com contexto suficiente pra que
 *     o handler da tool possa traduzir 404 → "CNPJ não encontrado" etc.
 *
 * NOTA SOBRE LOGS: este módulo não escreve em stdout. Qualquer log de debug
 * deve usar console.error (stderr), porque stdout é o canal MCP e qualquer
 * byte estranho ali quebra o protocolo.
 */

const BASE_URL = "https://brasilapi.com.br/api";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const USER_AGENT =
  "brasil-data-mcp/0.2.0 (+https://github.com/alanpcf/brasil-data-mcp)";

export class BrasilApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "BrasilApiError";
  }
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// Map simples como cache. Não precisa de locking: Node é single-threaded
// e mesmo que duas chamadas concorrentes pra mesma path façam fetch duas
// vezes, o resultado é idempotente — só desperdiça uma requisição.
const cache = new Map<string, CacheEntry>();

interface GetOptions {
  /** TTL em ms. `0` desabilita cache pra essa chamada. Default: 24h. */
  ttlMs?: number;
  /** Timeout em ms. Default: 10s. */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide se vale retentar baseado no status / erro.
 * - Erro de rede (fetch lança): sim.
 * - 5xx: sim (problema do servidor, pode ser transiente).
 * - 429: sim (rate limit, backoff resolve).
 * - 4xx (exceto 429): não — input ruim, retry só piora.
 */
function deveRetentar(status: number | null): boolean {
  if (status === null) return true; // erro de rede
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

async function executarRequisicao(
  path: string,
  timeoutMs: number,
): Promise<{ status: number; body: unknown; ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // Lê o body uma vez. Se não for JSON válido, devolve texto cru —
    // o handler decide o que fazer.
    let body: unknown;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { status: response.status, body, ok: response.ok };
  } finally {
    // Sempre limpa o timer. Sem isso, vaza handler do Node e o processo
    // demora mais pra encerrar (irritante em testes).
    clearTimeout(timer);
  }
}

async function getInterno<T>(path: string, opts: GetOptions): Promise<T> {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Cache hit: devolve direto sem tocar na rede.
  if (ttlMs > 0) {
    const hit = cache.get(path);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }
  }

  let ultimoErro: unknown;

  for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      const { status, body, ok } = await executarRequisicao(path, timeoutMs);

      if (ok) {
        if (ttlMs > 0) {
          cache.set(path, { value: body, expiresAt: Date.now() + ttlMs });
        }
        return body as T;
      }

      // Resposta com erro HTTP. Decide retentar ou abortar.
      if (!deveRetentar(status) || tentativa === MAX_RETRIES) {
        throw new BrasilApiError(
          `BrasilAPI retornou ${status} em ${path}`,
          status,
          path,
          body,
        );
      }
      // cai pro backoff abaixo
      ultimoErro = new BrasilApiError(
        `BrasilAPI ${status} (transiente)`,
        status,
        path,
        body,
      );
    } catch (err) {
      // BrasilApiError já lançado acima — propaga sem retentar.
      if (err instanceof BrasilApiError) throw err;

      // Erro de rede / abort. Retenta se ainda há tentativas.
      ultimoErro = err;
      if (tentativa === MAX_RETRIES) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BrasilApiError(`Falha de rede em ${path}: ${msg}`, 0, path);
      }
    }

    // Backoff exponencial: 200, 400, 800.
    const delayMs = 200 * Math.pow(2, tentativa);
    await sleep(delayMs);
  }

  // Inalcançável — o loop sempre retorna ou lança. Mas TS quer um fallback.
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error(`Falha desconhecida em ${path}`);
}

export const brasilApi = {
  get<T>(path: string, opts: GetOptions = {}): Promise<T> {
    return getInterno<T>(path, opts);
  },
  clearCache(): void {
    cache.clear();
  },
};
