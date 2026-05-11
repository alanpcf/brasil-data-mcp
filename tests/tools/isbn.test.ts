import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarIsbnHandler } from "../../src/tools/isbn.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_isbn", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna metadados de ISBN-13 válido", async () => {
    const dados = {
      isbn: "9788532530802",
      title: "Harry Potter e a Pedra Filosofal",
      authors: ["J. K. Rowling"],
      publisher: "Rocco",
    };
    fetchMock.mockResolvedValueOnce(fakeResponse(dados));

    const r = await consultarIsbnHandler({ codigo: "9788532530802" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.title).toContain("Harry Potter");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/isbn/v1/9788532530802");
  });

  it("aceita ISBN com hífens", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ isbn: "9788532530802" }));

    const r = await consultarIsbnHandler({ codigo: "978-85-325-3080-2" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/isbn/v1/9788532530802");
  });

  it("aceita ISBN-10 terminando em X", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ isbn: "043942089X" }));

    const r = await consultarIsbnHandler({ codigo: "0-439-42089-X" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/isbn/v1/043942089X");
  });

  it("rejeita ISBN com menos de 10 dígitos sem chamar a rede", async () => {
    const r = await consultarIsbnHandler({ codigo: "12345" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita ISBN com letras (exceto X final) sem chamar a rede", async () => {
    const r = await consultarIsbnHandler({ codigo: "abc1234567890" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ message: "not found" }, 404),
    );

    const r = await consultarIsbnHandler({ codigo: "9780000000002" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("não encontrado");
  });
});
