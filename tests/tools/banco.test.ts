import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import {
  consultarBancoHandler,
  listarBancosHandler,
} from "../../src/tools/banco.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_banco", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna o banco pelo código numérico", async () => {
    const dados = { ispb: "60746948", name: "BCO BRADESCO S.A.", code: 237 };
    fetchMock.mockResolvedValueOnce(fakeResponse(dados));

    const r = await consultarBancoHandler({ codigo: 237 });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.code).toBe(237);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/banks/v1/237");
  });

  it("aceita código como string", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ code: 341, name: "ITAU" }));

    const r = await consultarBancoHandler({ codigo: "341" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/banks/v1/341");
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ message: "not found" }, 404));

    const r = await consultarBancoHandler({ codigo: 9999 });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("não encontrado");
  });

  it("rejeita código não-numérico sem chamar a rede", async () => {
    const r = await consultarBancoHandler({ codigo: "abc" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("listar_bancos", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna a lista completa de bancos", async () => {
    const lista = [
      { code: 1, name: "BCO DO BRASIL S.A." },
      { code: 237, name: "BCO BRADESCO S.A." },
      { code: 341, name: "ITAU UNIBANCO S.A." },
    ];
    fetchMock.mockResolvedValueOnce(fakeResponse(lista));

    const r = await listarBancosHandler({});

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(3);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/banks/v1");
  });
});
