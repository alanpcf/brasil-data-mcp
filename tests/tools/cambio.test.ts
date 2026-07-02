import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import {
  consultarCambioHandler,
  listarMoedasHandler,
} from "../../src/tools/cambio.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Mesmo cálculo do código de produção — nunca hardcodar a data de hoje. */
function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  brasilApi.clearCache();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const COTACAO = {
  cotacoes: [
    {
      paridade_compra: 1,
      paridade_venda: 1,
      cotacao_compra: 5.1768,
      cotacao_venda: 5.1774,
      data_hora_cotacao: "2026-06-26 10:03:14.403513",
      tipo_boletim: "ABERTURA",
    },
  ],
  moeda: "USD",
  data: "2026-06-26",
};

describe("consultarCambioHandler", () => {
  it("retorna cotações do USD para data específica", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeResponse(COTACAO)));

    const r = await consultarCambioHandler({
      moeda: "USD",
      data: "2026-06-26",
    });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.cotacoes[0].tipo_boletim).toBe("ABERTURA");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cambio/v1/cotacao/USD/2026-06-26");
  });

  it("normaliza moeda minúscula e data DD/MM/YYYY pra mesma URL", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeResponse(COTACAO)));

    const r = await consultarCambioHandler({
      moeda: "usd",
      data: "26/06/2026",
    });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cambio/v1/cotacao/USD/2026-06-26");
  });

  it("usa ontem (America/Sao_Paulo) quando data é omitida — a fonte não expõe o dia corrente", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeResponse(COTACAO)));

    const r = await consultarCambioHandler({ moeda: "EUR" });

    expect(r.isError).toBeUndefined();
    const ontem = somarDias(hojeSaoPaulo(), -1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/cambio/v1/cotacao/EUR/${ontem}`);
  });

  it("rejeita a data de hoje com explicação, sem chamar a rede", async () => {
    const r = await consultarCambioHandler({
      moeda: "USD",
      data: hojeSaoPaulo(),
    });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("dia corrente");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita moeda não suportada sem chamar a rede", async () => {
    const r = await consultarCambioHandler({ moeda: "BRL" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "Moeda não suportada",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita data futura sem chamar a rede", async () => {
    // Amanhã em SP: hoje + 1 dia, calculado (nunca hardcoded).
    const dataFutura = somarDias(hojeSaoPaulo(), 1);

    const r = await consultarCambioHandler({ moeda: "USD", data: dataFutura });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("futuras");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita formato de data inválido sem chamar a rede", async () => {
    for (const dataRuim of ["2026-02-30", "ontem", "26-06-2026"]) {
      const r = await consultarCambioHandler({ moeda: "USD", data: dataRuim });
      expect(r.isError).toBe(true);
      expect((r.content[0] as { text: string }).text).toContain(
        "Data inválida",
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ msg: "not found" }, 404)),
    );

    const r = await consultarCambioHandler({
      moeda: "USD",
      data: "2026-06-26",
    });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não encontrada",
    );
  });
});

describe("listarMoedasHandler", () => {
  it("retorna a lista de moedas", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse([
          { simbolo: "USD", nome: "Dólar dos Estados Unidos", tipo_moeda: "A" },
          { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
        ]),
      ),
    );

    const r = await listarMoedasHandler({});

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload).toHaveLength(2);
    expect(payload[0].simbolo).toBe("USD");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cambio/v1/moedas");
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ msg: "not found" }, 404)),
    );

    const r = await listarMoedasHandler({});

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não disponível",
    );
  });
});
