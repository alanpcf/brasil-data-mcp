import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CpfCnpjError,
  cpfcnpj,
  cpfcnpjHabilitado,
  pacoteCnpjConfigurado,
} from "../../src/clients/cpfcnpj.js";
import { VERSION } from "../../src/version.js";

function fakeJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const TOKEN = "TOKEN_DE_TESTE_1234567890";

const sucessoCnpj = {
  status: 1,
  cnpj: "11.222.333/0001-81",
  razao: "TOKEN TEST LTDA",
  saldo: 123,
  consultaID: "11bb22cc33dd44ee",
  pacoteUsado: 6,
  comprovantePdfBase64: "JVBERi0xLjcKAAAA",
};

describe("cpfcnpjHabilitado / pacoteCnpjConfigurado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("desligado quando não há token", () => {
    vi.stubEnv("CPFCNPJ_TOKEN", "");
    expect(cpfcnpjHabilitado()).toBe(false);
  });

  it("ligado com token e base https padrão", () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    expect(cpfcnpjHabilitado()).toBe(true);
  });

  it("base URL não-https desliga o provedor e avisa em stderr", () => {
    const erroSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    vi.stubEnv("CPFCNPJ_BASE_URL", "http://inseguro.example");
    expect(cpfcnpjHabilitado()).toBe(false);
    expect(erroSpy).toHaveBeenCalled();
  });

  it("pacote padrão é 6, aceita 5, ignora valores fora do par", () => {
    vi.stubEnv("CPFCNPJ_CNPJ_PACOTE", "");
    expect(pacoteCnpjConfigurado()).toBe(6);
    vi.stubEnv("CPFCNPJ_CNPJ_PACOTE", "5");
    expect(pacoteCnpjConfigurado()).toBe(5);
    vi.stubEnv("CPFCNPJ_CNPJ_PACOTE", "99");
    expect(pacoteCnpjConfigurado()).toBe(6);
  });
});

describe("cpfcnpj.consultar", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cpfcnpj.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lança sem consultar a rede quando não há token", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", "");
    await expect(cpfcnpj.consultar(6, "11222333000181")).rejects.toBeInstanceOf(
      CpfCnpjError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("monta a URL com token, pacote e documento no path", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    await cpfcnpj.consultar(6, "11222333000181");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      `https://api.cpfcnpj.com.br/${TOKEN}/6/11222333000181`,
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain(`brasil-data-mcp/${VERSION}`);
  });

  it("respeita CPFCNPJ_BASE_URL https customizada", async () => {
    vi.stubEnv("CPFCNPJ_BASE_URL", "https://custom.example/");
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    await cpfcnpj.consultar(5, "11222333000181");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(`https://custom.example/${TOKEN}/5/11222333000181`);
  });

  it("remove campos operacionais e o PDF base64 da resposta", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    const dados = (await cpfcnpj.consultar(6, "11222333000181")) as Record<
      string,
      unknown
    >;

    expect(dados.razao).toBe("TOKEN TEST LTDA");
    expect(dados.saldo).toBeUndefined();
    expect(dados.consultaID).toBeUndefined();
    expect(dados.pacoteUsado).toBeUndefined();
    expect(dados.comprovantePdfBase64).toBeUndefined();
  });

  it("converte status: 0 no corpo em CpfCnpjError com o código", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeJson({ status: 0, erro: "O CNPJ informado não existe", erroCodigo: 202, pacoteUsado: 6 }),
    );

    try {
      await cpfcnpj.consultar(6, "11222333000181");
      expect.fail("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(CpfCnpjError);
      expect((err as CpfCnpjError).codigo).toBe(202);
      expect((err as CpfCnpjError).pacote).toBe(6);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("NÃO retenta em erroCodigo de conta (1000)", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeJson({ status: 0, erro: "Token não pertence ao IP", erroCodigo: 1000 }),
    );

    await expect(cpfcnpj.consultar(6, "11222333000181")).rejects.toBeInstanceOf(
      CpfCnpjError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cache hit: 2ª chamada do mesmo pacote/documento não bate na rede", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    await cpfcnpj.consultar(6, "11222333000181");
    await cpfcnpj.consultar(6, "11222333000181");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ttlMs: 0 desabilita o cache", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    await cpfcnpj.consultar(6, "11222333000181", { ttlMs: 0 });
    await cpfcnpj.consultar(6, "11222333000181", { ttlMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("teto MAX_CACHE_ENTRIES: despeja a entrada mais antiga ao exceder", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson(sucessoCnpj)));

    // 1001 documentos distintos: teto é 1000, então uma entrada é despejada.
    for (let i = 0; i <= 1000; i++) {
      await cpfcnpj.consultar(6, `doc-${i}`);
    }

    expect(cpfcnpj.cacheSize()).toBe(1000);

    // A mais antiga (doc-0) saiu: consultá-la de novo bate na rede.
    const antes = fetchMock.mock.calls.length;
    await cpfcnpj.consultar(6, "doc-0");
    expect(fetchMock.mock.calls.length).toBe(antes + 1);

    // A mais recente (doc-1000) continua em cache: não bate na rede.
    const antes2 = fetchMock.mock.calls.length;
    await cpfcnpj.consultar(6, "doc-1000");
    expect(fetchMock.mock.calls.length).toBe(antes2);
  });

  it("entrada expirada é removida do Map na leitura (mesmo se a rebusca falhar)", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(fakeJson(sucessoCnpj)),
      );
      await cpfcnpj.consultar(6, "11222333000181", { ttlMs: 1000 });
      expect(cpfcnpj.cacheSize()).toBe(1);

      vi.advanceTimersByTime(1001); // expira

      // Leitura da entrada expirada: é deletada antes da rebusca. A rebusca
      // devolve erro de conta (não grava nada), então o Map fica vazio.
      fetchMock.mockResolvedValue(
        fakeJson({ status: 0, erro: "token/IP", erroCodigo: 1000 }),
      );
      await cpfcnpj
        .consultar(6, "11222333000181", { ttlMs: 1000 })
        .catch(() => {});

      expect(cpfcnpj.cacheSize()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("nenhuma mensagem de erro contém o token (falha de rede)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    try {
      await cpfcnpj.consultar(6, "11222333000181", {
        ttlMs: 0,
        timeoutMs: 100,
      });
      expect.fail("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(CpfCnpjError);
      expect((err as CpfCnpjError).message).not.toContain(TOKEN);
      expect((err as CpfCnpjError).status).toBe(0);
    }
  }, 10_000);
});

// Backoffs (200/400/800ms) avançados virtualmente com fake timers.
describe("cpfcnpj.consultar (retry)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cpfcnpj.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("HTTP 5xx transiente: retenta e sucede na tentativa seguinte", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(fakeJson({ status: 0, erro: "boom" }, 503)),
      )
      .mockImplementationOnce(() => Promise.resolve(fakeJson(sucessoCnpj)));

    const promessa = cpfcnpj.consultar(6, "11222333000181", { ttlMs: 0 });
    await vi.advanceTimersByTimeAsync(200);

    const dados = (await promessa) as Record<string, unknown>;
    expect(dados.razao).toBe("TOKEN TEST LTDA");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("erroCodigo 1007 retenta UMA vez e depois sucede", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(
          fakeJson({ status: 0, erro: "limite por segundo", erroCodigo: 1007 }),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve(fakeJson(sucessoCnpj)));

    const promessa = cpfcnpj.consultar(6, "11222333000181", { ttlMs: 0 });
    await vi.advanceTimersByTimeAsync(200);

    const dados = (await promessa) as Record<string, unknown>;
    expect(dados.razao).toBe("TOKEN TEST LTDA");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("erroCodigo 1007 persistente: só uma retentativa, depois lança", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeJson({ status: 0, erro: "limite por segundo", erroCodigo: 1007 }),
      ),
    );

    const promessa = cpfcnpj.consultar(6, "11222333000181", { ttlMs: 0 }).then(
      () => {
        throw new Error("deveria ter lançado");
      },
      (err: unknown) => err,
    );
    await vi.advanceTimersByTimeAsync(200);

    const err = (await promessa) as CpfCnpjError;
    expect(err).toBeInstanceOf(CpfCnpjError);
    expect(err.codigo).toBe(1007);
    // 1 inicial + 1 retentativa (só uma pra 1006/1007).
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
