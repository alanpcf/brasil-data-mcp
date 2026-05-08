import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarFeriadosHandler } from "../../src/tools/feriados.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("consultar_feriados", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna a lista de feriados de um ano válido", async () => {
    const feriados = [
      { date: "2026-01-01", name: "Confraternização mundial", type: "national" },
      { date: "2026-04-21", name: "Tiradentes", type: "national" },
    ];
    fetchMock.mockResolvedValueOnce(fakeResponse(feriados));

    const r = await consultarFeriadosHandler({ ano: 2026 });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload).toHaveLength(2);
    expect(payload[0].name).toBe("Confraternização mundial");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/feriados/v1/2026");
  });

  it("rejeita ano abaixo da faixa (< 1900) sem chamar a rede", async () => {
    const r = await consultarFeriadosHandler({ ano: 1850 });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita ano acima da faixa (> 2199) sem chamar a rede", async () => {
    const r = await consultarFeriadosHandler({ ano: 2200 });

    expect(r.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ message: "not found" }, 404));

    const r = await consultarFeriadosHandler({ ano: 1901 });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não encontrados",
    );
  });
});
