/**
 * Cliente HTTP do provedor premium OPCIONAL cpfcnpj.com.br.
 *
 * Espelha src/clients/brasilapi.ts (cache TTL em memória, retry com backoff
 * exponencial, timeout via AbortController, User-Agent versionado), com as
 * diferenças do contrato desta API:
 *
 *   - Opt-in por ambiente: só liga quando CPFCNPJ_TOKEN existe. Sem token, o
 *     servidor se comporta exatamente como hoje (BrasilAPI, sem chave).
 *   - O token viaja no PRIMEIRO segmento do path (não é header), então nenhuma
 *     mensagem de erro, log ou chave de cache pode conter a URL completa nem o
 *     token. A chave de cache é só `${pacote}/${documento}`.
 *   - A API responde HTTP 200 mesmo em falha, sinalizando pelo corpo
 *     (`{status: 0, erro, erroCodigo}`). O cliente converte `status !== 1` em
 *     CpfCnpjError com o código de negócio.
 *   - TTL padrão de 1 h: coerente com o cache de proteção da própria API e com
 *     o pacote 6 em tempo real; evita repetir cobrança dentro do mesmo turno.
 *   - Campos operacionais que não servem ao LLM (saldo, consultaID, pacoteUsado
 *     e o comprovantePdfBase64 de dezenas de KB) são removidos da resposta.
 *
 * NOTA SOBRE LOGS: este módulo não escreve em stdout. Logs de aviso vão em
 * console.error (stderr); stdout é o canal MCP.
 *
 * As variáveis de ambiente são lidas em FUNÇÃO (não no import) para o servidor
 * poder ligar/desligar o provedor sem reimportar o módulo e para os testes
 * usarem vi.stubEnv.
 */

import { VERSION } from "../version.js";

const DEFAULT_BASE_URL = "https://api.cpfcnpj.com.br";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 h
const MAX_RETRIES = 3;
// Teto do cache em memória. O Map guarda ordem de inserção, então ao atingir
// o teto a entrada mais antiga é despejada (FIFO). Evita crescimento sem
// limite num servidor de longa duração.
const MAX_CACHE_ENTRIES = 1000;
const USER_AGENT = `brasil-data-mcp/${VERSION} (+https://github.com/alanpcf/brasil-data-mcp)`;

// Códigos de negócio transitórios do fornecedor: valem UMA retentativa.
// 1006 = fornecedor off-line; 1007 = limite de requisições por segundo.
const CODIGOS_RETENTAVEIS = new Set([1006, 1007]);

// Campos operacionais removidos da resposta antes de chegar ao modelo.
const CAMPOS_OPERACIONAIS = [
  "saldo",
  "consultaID",
  "pacoteUsado",
  "comprovantePdfBase64",
];

export class CpfCnpjError extends Error {
  constructor(
    message: string,
    public readonly codigo: number,
    public readonly pacote: number,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CpfCnpjError";
  }
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

interface ConsultarOptions {
  /** TTL em ms. `0` desabilita cache pra essa chamada. Default: 1 h. */
  ttlMs?: number;
  /** Timeout em ms. Default: 10 s. */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Token da conta, sem espaços. Vazio = provedor desligado. */
function lerToken(): string {
  return (process.env.CPFCNPJ_TOKEN ?? "").trim();
}

/**
 * URL base do provedor. Só aceita https:// (o token vai no path). Valor
 * inválido desliga o provedor e avisa em stderr, devolvendo null.
 */
function lerBaseUrl(): string | null {
  const bruto = (process.env.CPFCNPJ_BASE_URL ?? "").trim();
  if (bruto === "") return DEFAULT_BASE_URL;
  if (!bruto.startsWith("https://")) {
    console.error(
      "[brasil-data-mcp] CPFCNPJ_BASE_URL ignorada: apenas https:// é aceito; provedor cpfcnpj.com.br desligado.",
    );
    return null;
  }
  return bruto.replace(/\/+$/, "");
}

/** Pacote de CNPJ configurado: 5 (enxuto) ou 6 (completo). Default: 6. */
export function pacoteCnpjConfigurado(): number {
  return (process.env.CPFCNPJ_CNPJ_PACOTE ?? "").trim() === "5" ? 5 : 6;
}

/** True quando há token e a base URL é https:// válida. */
export function cpfcnpjHabilitado(): boolean {
  return lerToken() !== "" && lerBaseUrl() !== null;
}

/** Decide retentar por status HTTP: rede (0), 429 e 5xx. */
function deveRetentar(status: number): boolean {
  if (status === 0) return true;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/** Sucesso é sinalizado por `status: 1` no corpo. */
function ehSucesso(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { status?: unknown }).status === 1
  );
}

/** Extrai `erroCodigo` do corpo de erro (0 quando ausente/malformado). */
function extrairErroCodigo(body: unknown): number {
  if (typeof body === "object" && body !== null) {
    const c = (body as { erroCodigo?: unknown }).erroCodigo;
    if (typeof c === "number") return c;
  }
  return 0;
}

/** Extrai a mensagem `erro` do corpo (sem nunca conter o token/URL). */
function extrairErroMensagem(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const m = (body as { erro?: unknown }).erro;
    if (typeof m === "string" && m !== "") return m;
  }
  return "o provedor retornou uma falha sem mensagem.";
}

/** Remove campos operacionais que não servem ao LLM. */
function limparResposta(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const copia: Record<string, unknown> = {
    ...(body as Record<string, unknown>),
  };
  for (const campo of CAMPOS_OPERACIONAIS) {
    delete copia[campo];
  }
  return copia;
}

async function executarRequisicao(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: unknown; ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    let body: unknown;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { status: response.status, body, ok: response.ok };
  } finally {
    clearTimeout(timer);
  }
}

async function consultarInterno<T>(
  pacote: number,
  documento: string,
  opts: ConsultarOptions,
): Promise<T> {
  const token = lerToken();
  const baseUrl = lerBaseUrl();
  if (token === "" || baseUrl === null) {
    throw new CpfCnpjError(
      "provedor cpfcnpj.com.br não configurado (defina CPFCNPJ_TOKEN).",
      0,
      pacote,
      0,
    );
  }

  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Chave de cache NUNCA inclui o token: só pacote + documento.
  const chaveCache = `${pacote}/${documento}`;
  if (ttlMs > 0) {
    const hit = cache.get(chaveCache);
    if (hit) {
      if (hit.expiresAt > Date.now()) {
        return hit.value as T;
      }
      // Entrada expirada: remove na leitura pra não ficar ocupando o Map.
      cache.delete(chaveCache);
    }
  }

  const url = `${baseUrl}/${token}/${pacote}/${documento}`;

  let ultimoErro: unknown;

  for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      const { status, body, ok } = await executarRequisicao(url, timeoutMs);

      if (ok && ehSucesso(body)) {
        const limpo = limparResposta(body);
        if (ttlMs > 0) {
          // Aplica o teto antes de gravar uma chave nova: despeja a entrada
          // mais antiga (primeira do Map). Regravar chave existente não conta.
          if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(chaveCache)) {
            const maisAntiga = cache.keys().next().value;
            if (maisAntiga !== undefined) {
              cache.delete(maisAntiga);
            }
          }
          cache.set(chaveCache, {
            value: limpo,
            expiresAt: Date.now() + ttlMs,
          });
        }
        return limpo as T;
      }

      if (ok) {
        // HTTP 200 com status: 0 no corpo. Converte em CpfCnpjError.
        const codigo = extrairErroCodigo(body);
        const mensagem = extrairErroMensagem(body);
        // 1006/1007 são transitórios: uma única retentativa.
        if (CODIGOS_RETENTAVEIS.has(codigo) && tentativa === 0) {
          ultimoErro = new CpfCnpjError(mensagem, codigo, pacote, status);
        } else {
          throw new CpfCnpjError(mensagem, codigo, pacote, status);
        }
      } else {
        // HTTP não-2xx (o único documentado é 429 nos pacotes de NF-e).
        if (!deveRetentar(status) || tentativa === MAX_RETRIES) {
          throw new CpfCnpjError(
            "o provedor retornou um erro de transporte.",
            0,
            pacote,
            status,
          );
        }
        ultimoErro = new CpfCnpjError(
          "erro de transporte transiente.",
          0,
          pacote,
          status,
        );
      }
    } catch (err) {
      if (err instanceof CpfCnpjError) throw err;

      // Erro de rede / abort. Nunca inclui a URL na mensagem.
      ultimoErro = err;
      if (tentativa === MAX_RETRIES) {
        throw new CpfCnpjError(
          "falha de rede ao alcançar o provedor.",
          0,
          pacote,
          0,
        );
      }
    }

    // Backoff exponencial: 200, 400, 800.
    await sleep(200 * Math.pow(2, tentativa));
  }

  // Inalcançável: o loop sempre retorna ou lança.
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new CpfCnpjError("falha desconhecida no provedor.", 0, pacote, 0);
}

export const cpfcnpj = {
  consultar<T>(
    pacote: number,
    documento: string,
    opts: ConsultarOptions = {},
  ): Promise<T> {
    return consultarInterno<T>(pacote, documento, opts);
  },
  clearCache(): void {
    cache.clear();
  },
  /** Número de entradas vivas no cache. Observabilidade e testes. */
  cacheSize(): number {
    return cache.size;
  },
};
