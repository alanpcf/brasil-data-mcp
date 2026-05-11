import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarDddHandler } from "../../src/tools/ddd.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_ddd", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna estado e cidades do DDD", async () => {
    const dados = { state: "SP", cities: ["SÃO PAULO", "OSASCO", "GUARULHOS"] };
    fetchMock.mockResolvedValueOnce(fakeResponse(dados));

    const r = await consultarDddHandler({ ddd: 11 });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.state).toBe("SP");
    expect(payload.cities).toContain("SÃO PAULO");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/ddd/v1/11");
  });

  it("aceita DDD como string", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ state: "PR", cities: [] }));

    const r = await consultarDddHandler({ ddd: "41" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/ddd/v1/41");
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ message: "not found" }, 404),
    );

    const r = await consultarDddHandler({ ddd: 23 });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("não encontrado");
  });

  it("rejeita DDD começando com 0 sem chamar a rede", async () => {
    const r = await consultarDddHandler({ ddd: "01" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita DDD não-numérico sem chamar a rede", async () => {
    const r = await consultarDddHandler({ ddd: "abc" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita DDD com 3 dígitos sem chamar a rede", async () => {
    const r = await consultarDddHandler({ ddd: 111 });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
