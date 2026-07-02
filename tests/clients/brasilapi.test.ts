import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrasilApiError, brasilApi } from "../../src/clients/brasilapi.js";
import { VERSION } from "../../src/version.js";

function fakeJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("brasilApi.get", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cacheia sucesso: 2ª chamada não bate na rede", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson({ ok: 1 })));

    await brasilApi.get("/x");
    await brasilApi.get("/x");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ttlMs: 0 desabilita cache (sempre bate na rede)", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson({ ok: 1 })));

    await brasilApi.get("/x", { ttlMs: 0 });
    await brasilApi.get("/x", { ttlMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearCache zera o cache em memória", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson({ ok: 1 })));

    await brasilApi.get("/x");
    brasilApi.clearCache();
    await brasilApi.get("/x");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("4xx do cliente NÃO retenta — falha já na 1ª tentativa", async () => {
    fetchMock.mockResolvedValueOnce(fakeJson({ msg: "bad" }, 400));

    await expect(brasilApi.get("/x")).rejects.toBeInstanceOf(BrasilApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("404 propaga BrasilApiError com status 404 (sem retry)", async () => {
    fetchMock.mockResolvedValueOnce(fakeJson({ msg: "not found" }, 404));

    try {
      await brasilApi.get("/x");
      expect.fail("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(BrasilApiError);
      expect((err as BrasilApiError).status).toBe(404);
      expect((err as BrasilApiError).path).toBe("/x");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("erro de rede vira BrasilApiError com status 0 após esgotar retries", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    try {
      // ttlMs: 0 só por garantia de cache vazio; timeoutMs baixo pra ser
      // rápido caso algo demore (não deve, mockRejectedValue é síncrono).
      await brasilApi.get("/x", { ttlMs: 0, timeoutMs: 100 });
      expect.fail("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(BrasilApiError);
      expect((err as BrasilApiError).status).toBe(0);
    }
    // 1 inicial + 3 retries (MAX_RETRIES=3) = 4 chamadas no total.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10_000);

  it("envia User-Agent e Accept identificando o pacote", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeJson({ ok: 1 })));

    await brasilApi.get("/x");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain(`brasil-data-mcp/${VERSION}`);
    expect(headers["Accept"]).toBe("application/json");
  });
});

// Fake timers escopados a este describe: os backoffs (200/400/800ms) são
// avançados virtualmente, sem custo real na suíte. O describe acima segue
// com timers reais — o teste de erro de rede (1.4s) não é afetado.
describe("brasilApi.get — retry em 5xx/429 transiente", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    brasilApi.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("5xx transiente: retenta com backoff e sucede na tentativa seguinte", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(fakeJson({ msg: "boom" }, 503)),
      )
      .mockImplementationOnce(() => Promise.resolve(fakeJson({ ok: 1 })));

    const promessa = brasilApi.get("/x", { ttlMs: 0 });
    await vi.advanceTimersByTimeAsync(200); // 1º backoff

    await expect(promessa).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("429 também retenta (rate limit é transiente)", async () => {
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(fakeJson({ msg: "slow down" }, 429)),
      )
      .mockImplementationOnce(() => Promise.resolve(fakeJson({ ok: 1 })));

    const promessa = brasilApi.get("/x", { ttlMs: 0 });
    await vi.advanceTimersByTimeAsync(200);

    await expect(promessa).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5xx persistente: esgota MAX_RETRIES e lança BrasilApiError com o status", async () => {
    // mockImplementation (não mockResolvedValue): Response só permite ler
    // o body uma vez — cada tentativa precisa de um Response fresco.
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeJson({ msg: "boom" }, 503)),
    );

    // Handler de rejeição anexado ANTES de avançar os timers, senão o
    // vitest acusa unhandled rejection no meio dos backoffs.
    const promessa = brasilApi.get("/x", { ttlMs: 0 }).then(
      () => {
        throw new Error("deveria ter lançado");
      },
      (err: unknown) => err,
    );
    await vi.advanceTimersByTimeAsync(1400); // 200 + 400 + 800

    const err = (await promessa) as BrasilApiError;
    expect(err).toBeInstanceOf(BrasilApiError);
    expect(err.status).toBe(503);
    expect(err.path).toBe("/x");
    // 1 inicial + 3 retries (MAX_RETRIES=3) = 4 chamadas.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
