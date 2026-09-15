import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { cpfcnpj } from "../../src/clients/cpfcnpj.js";
import { consultarCnpjHandler } from "../../src/tools/cnpj.js";

/**
 * Helper: gera um Response simulando a BrasilAPI.
 * Usado pra evitar repetir new Response() em todo teste.
 */
function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_cnpj", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // Garante o caminho grátis mesmo se o ambiente local tiver o token.
    vi.stubEnv("CPFCNPJ_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retorna JSON com dados quando o CNPJ existe", async () => {
    const dadosFake = {
      cnpj: "33000167000101",
      razao_social: "PETROLEO BRASILEIRO S A PETROBRAS",
      uf: "RJ",
    };
    fetchMock.mockResolvedValueOnce(fakeResponse(dadosFake));

    const r = await consultarCnpjHandler({ cnpj: "33.000.167/0001-01" });

    expect(r.isError).toBeUndefined();
    expect(r.content[0]).toMatchObject({ type: "text" });
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.razao_social).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    expect(payload.fonte).toBeUndefined();

    // Confirma que o fetch foi chamado com o CNPJ limpo (sem máscara).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cnpj/v1/33000167000101");
  });

  it("traduz 404 da BrasilAPI em mensagem em português", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ message: "not found" }, 404),
    );

    const r = await consultarCnpjHandler({ cnpj: "12345678000195" });

    expect(r.isError).toBe(true);
    const text = (r.content[0] as { text: string }).text;
    expect(text).toContain("não encontrado na base da Receita Federal");
    expect(text).toContain("12345678000195");
  });

  it("rejeita CNPJ inválido (todos iguais) sem chamar a rede", async () => {
    const r = await consultarCnpjHandler({ cnpj: "11111111111111" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CNPJ inválido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita CNPJ com menos de 14 dígitos sem chamar a rede", async () => {
    const r = await consultarCnpjHandler({ cnpj: "123" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CNPJ inválido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aceita CNPJ com e sem máscara (ambos resultam na mesma URL)", async () => {
    // mockImplementation devolve um Response novo a cada chamada.
    // mockResolvedValue reutilizaria a mesma instância — e Response só pode
    // ter o body lido uma vez, então a 2ª leitura quebraria.
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ cnpj: "33000167000101" })),
    );

    await consultarCnpjHandler({ cnpj: "33.000.167/0001-01" });
    brasilApi.clearCache(); // força segunda chamada na rede em vez de cache
    await consultarCnpjHandler({ cnpj: "33000167000101" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url1 = fetchMock.mock.calls[0][0] as string;
    const url2 = fetchMock.mock.calls[1][0] as string;
    expect(url1).toBe(url2);
  });
});

const TOKEN = "TOKEN_DE_TESTE_1234567890";

describe("consultar_cnpj com provedor premium (cpfcnpj.com.br)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    cpfcnpj.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("com token: usa cpfcnpj.com.br e marca a fonte", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse({ status: 1, cnpj: "11.222.333/0001-81", razao: "TOKEN TEST LTDA" }),
      ),
    );

    const r = await consultarCnpjHandler({ cnpj: "11.222.333/0001-81" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.fonte).toBe("cpfcnpj.com.br");
    expect(payload.razao).toBe("TOKEN TEST LTDA");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/${TOKEN}/6/11222333000181`);
  });

  it("respeita o pacote configurado via CPFCNPJ_CNPJ_PACOTE", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    vi.stubEnv("CPFCNPJ_CNPJ_PACOTE", "5");
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ status: 1, razao: "TOKEN TEST LTDA" })),
    );

    await consultarCnpjHandler({ cnpj: "11222333000181" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/${TOKEN}/5/11222333000181`);
  });

  it("aceita CNPJ alfanumérico quando o provedor está ligado", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ status: 1, razao: "ALFA LTDA" })),
    );

    const r = await consultarCnpjHandler({ cnpj: "12ABC34501DE35" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/6/12ABC34501DE35`);
  });

  it("falha do provedor (numérico) cai para a BrasilAPI", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    const erroSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 1ª chamada (cpfcnpj): erro de conta 1000 (não retenta).
    // 2ª chamada (BrasilAPI): sucesso.
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({ status: 0, erro: "token/IP", erroCodigo: 1000 }),
      )
      .mockResolvedValueOnce(
        fakeResponse({ cnpj: "11222333000181", razao_social: "FALLBACK LTDA" }),
      );

    const r = await consultarCnpjHandler({ cnpj: "11222333000181" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.fonte).toBe("BrasilAPI");
    expect(payload.razao_social).toBe("FALLBACK LTDA");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(erroSpy).toHaveBeenCalled();
    // Erro de conta (1000): o JSON avisa que o provedor não entregou.
    expect(payload.aviso_provedor).toContain("Provedor cpfcnpj.com.br");
    expect(payload.aviso_provedor).not.toContain(TOKEN);
  });

  it("erro transitório do provedor: cai para a BrasilAPI SEM aviso_provedor", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    const erroSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 1005 = fonte oficial temporariamente indisponível (transitório).
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({ status: 0, erro: "fonte off", erroCodigo: 1005 }),
      )
      .mockResolvedValueOnce(
        fakeResponse({ cnpj: "11222333000181", razao_social: "FALLBACK LTDA" }),
      );

    const r = await consultarCnpjHandler({ cnpj: "11222333000181" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.fonte).toBe("BrasilAPI");
    expect(payload.aviso_provedor).toBeUndefined();
    expect(erroSpy).toHaveBeenCalled();
  });

  it("com token: CNPJ numérico de DV errado é rejeitado sem fetch", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);

    const r = await consultarCnpjHandler({ cnpj: "11222333000199" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "Dígito verificador inválido",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com token: formato inválido é rejeitado sem fetch", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);

    const r = await consultarCnpjHandler({ cnpj: "123" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CNPJ inválido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("campo 'fonte' vindo da API não sobrescreve a procedência", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse({ status: 1, fonte: "x", razao: "TOKEN TEST LTDA" }),
      ),
    );

    const r = await consultarCnpjHandler({ cnpj: "11222333000181" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.fonte).toBe("cpfcnpj.com.br");
  });

  it("alfanumérico sem token: consulta a BrasilAPI, sem campo fonte", async () => {
    vi.stubEnv("CPFCNPJ_TOKEN", "");
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ cnpj: "12ABC34501DE35", razao_social: "ALFA LTDA" })),
    );

    const r = await consultarCnpjHandler({ cnpj: "12ABC34501DE35" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.razao_social).toBe("ALFA LTDA");
    expect(payload.fonte).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cnpj/v1/12ABC34501DE35");
  });
});
