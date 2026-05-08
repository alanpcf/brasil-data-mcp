import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
