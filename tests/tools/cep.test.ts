import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarCepHandler } from "../../src/tools/cep.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_cep", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna endereço quando o CEP existe", async () => {
    const dadosFake = {
      cep: "01310100",
      state: "SP",
      city: "São Paulo",
      neighborhood: "Bela Vista",
      street: "Avenida Paulista",
    };
    fetchMock.mockResolvedValueOnce(fakeResponse(dadosFake));

    const r = await consultarCepHandler({ cep: "01310-100" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.city).toBe("São Paulo");
    expect(payload.state).toBe("SP");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cep/v2/01310100");
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ message: "not found" }, 404));

    const r = await consultarCepHandler({ cep: "00000001" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("não encontrado");
  });

  it("rejeita CEP com formato inválido sem chamar a rede", async () => {
    const r = await consultarCepHandler({ cep: "123" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita sequência repetida (00000000) sem chamar a rede", async () => {
    const r = await consultarCepHandler({ cep: "00000000" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
