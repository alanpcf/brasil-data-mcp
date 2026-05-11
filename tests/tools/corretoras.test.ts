import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarCorretoraHandler } from "../../src/tools/corretoras.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_corretora", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna dados da corretora pelo CNPJ", async () => {
    const dados = {
      cnpj: "02332886001178",
      nome_social: "XP INVESTIMENTOS CCTVM S.A.",
      nome_comercial: "XP INVESTIMENTOS",
      status: "EM FUNCIONAMENTO NORMAL",
    };
    fetchMock.mockResolvedValueOnce(fakeResponse(dados));

    const r = await consultarCorretoraHandler({
      cnpj: "02.332.886/0011-78",
    });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.nome_comercial).toBe("XP INVESTIMENTOS");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cvm/corretoras/v1/02332886001178");
  });

  it("aceita CNPJ sem máscara", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ cnpj: "02332886001178" }));

    const r = await consultarCorretoraHandler({ cnpj: "02332886001178" });

    expect(r.isError).toBeUndefined();
  });

  it("rejeita CNPJ com 13 dígitos sem chamar a rede", async () => {
    const r = await consultarCorretoraHandler({ cnpj: "1234567890123" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita CNPJ todo igual sem chamar a rede", async () => {
    const r = await consultarCorretoraHandler({ cnpj: "00000000000000" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ message: "not found" }, 404),
    );

    const r = await consultarCorretoraHandler({ cnpj: "12345678000195" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CVM");
  });
});
