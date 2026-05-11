import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import {
  consultarTaxaHandler,
  listarTaxasHandler,
} from "../../src/tools/taxas.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_taxa", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna a taxa Selic", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ nome: "SELIC", valor: 14.5 }),
    );

    const r = await consultarTaxaHandler({ sigla: "Selic" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.nome).toBe("SELIC");
    expect(payload.valor).toBe(14.5);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/taxas/v1/SELIC");
  });

  it("normaliza sigla em lower-case", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ nome: "CDI", valor: 14.4 }));

    const r = await consultarTaxaHandler({ sigla: "cdi" });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/taxas/v1/CDI");
  });

  it("rejeita sigla desconhecida sem chamar a rede", async () => {
    const r = await consultarTaxaHandler({ sigla: "DOLAR" });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ message: "not found" }, 404),
    );

    const r = await consultarTaxaHandler({ sigla: "IPCA" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("não encontrada");
  });
});

describe("listar_taxas", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna a lista completa de taxas", async () => {
    const lista = [
      { nome: "Selic", valor: 14.5 },
      { nome: "CDI", valor: 14.4 },
      { nome: "IPCA", valor: 4.14 },
    ];
    fetchMock.mockResolvedValueOnce(fakeResponse(lista));

    const r = await listarTaxasHandler({});

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(3);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/taxas/v1");
  });
});
