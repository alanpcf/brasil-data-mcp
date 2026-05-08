import { describe, expect, it } from "vitest";

import { BrasilApiError } from "../../src/clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../../src/utils/errors.js";

describe("traduzirErroBrasilApi", () => {
  const mapaPadrao = {
    notFound: "Recurso X não encontrado.",
    contextoErro: "Erro ao consultar X",
  };

  it("404 → mensagem específica do mapa", () => {
    const err = new BrasilApiError("not found", 404, "/x");
    expect(traduzirErroBrasilApi(err, mapaPadrao)).toBe(
      "Recurso X não encontrado.",
    );
  });

  it("400 → mensagem genérica de input inválido", () => {
    const err = new BrasilApiError("bad request", 400, "/x");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("Erro ao consultar X");
    expect(msg).toContain("dados inválidos");
    // não deve vazar o nome interno da API
    expect(msg).not.toContain("BrasilAPI");
    expect(msg).not.toContain("/x");
  });

  it("429 → mensagem de rate limit", () => {
    const err = new BrasilApiError("too many", 429, "/x");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("limite de requisições");
  });

  it("5xx → mensagem de indisponibilidade", () => {
    const err = new BrasilApiError("server error", 503, "/x");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("temporariamente indisponível");
  });

  it("status 0 (rede) → mensagem de falha de conectividade", () => {
    const err = new BrasilApiError("network", 0, "/x");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("falha de rede");
  });

  it("status inesperado → fallback informando o código", () => {
    const err = new BrasilApiError("teapot", 418, "/x");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("418");
  });

  it("erro não-BrasilApi → preserva a mensagem original", () => {
    const err = new Error("algo explodiu");
    const msg = traduzirErroBrasilApi(err, mapaPadrao);
    expect(msg).toContain("algo explodiu");
    expect(msg).toContain("Erro ao consultar X");
  });

  it("contextoErro default funciona quando omitido", () => {
    const err = new BrasilApiError("bad", 400, "/x");
    const msg = traduzirErroBrasilApi(err, { notFound: "..." });
    expect(msg).toContain("Erro ao consultar dados");
  });
});
