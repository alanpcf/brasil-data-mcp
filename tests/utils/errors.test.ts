import { describe, expect, it } from "vitest";

import { BrasilApiError } from "../../src/clients/brasilapi.js";
import { CpfCnpjError } from "../../src/clients/cpfcnpj.js";
import {
  traduzirErroBrasilApi,
  traduzirErroCpfCnpj,
} from "../../src/utils/errors.js";

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

describe("traduzirErroCpfCnpj", () => {
  const mapa = {
    notFound: "Documento X não localizado.",
    contextoErro: "Erro ao consultar X",
  };

  it("documento inválido (100/101/200/201)", () => {
    for (const codigo of [100, 101, 200, 201]) {
      const err = new CpfCnpjError("bad", codigo, 6, 200);
      expect(traduzirErroCpfCnpj(err, mapa)).toContain("documento inválido");
    }
  });

  it("não localizado (102/202) usa a mensagem do mapa", () => {
    for (const codigo of [102, 202]) {
      const err = new CpfCnpjError("nao existe", codigo, 6, 200);
      expect(traduzirErroCpfCnpj(err, mapa)).toBe("Documento X não localizado.");
    }
  });

  it("dados incompletos (103)", () => {
    const err = new CpfCnpjError("incompleto", 103, 6, 200);
    expect(traduzirErroCpfCnpj(err, mapa)).toContain("não retornaram todos os campos");
  });

  it("token/IP (1000), créditos (1001), bloqueio (1002/1003), pacote (1004)", () => {
    expect(traduzirErroCpfCnpj(new CpfCnpjError("t", 1000, 6, 200), mapa)).toContain(
      "IP de origem",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("c", 1001, 6, 200), mapa)).toContain(
      "créditos insuficientes",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("b", 1002, 6, 200), mapa)).toContain(
      "bloqueados",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("b", 1003, 6, 200), mapa)).toContain(
      "bloqueados",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("p", 1004, 6, 200), mapa)).toContain(
      "pacote não habilitado",
    );
  });

  it("fornecedor (1005/1006) e limite por segundo (1007)", () => {
    expect(traduzirErroCpfCnpj(new CpfCnpjError("f", 1005, 6, 200), mapa)).toContain(
      "temporariamente indisponível",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("f", 1006, 6, 200), mapa)).toContain(
      "temporariamente indisponível",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("l", 1007, 6, 200), mapa)).toContain(
      "limite de requisições por segundo",
    );
  });

  it("erro de transporte cai nas frases de HTTP (5xx/429/rede)", () => {
    expect(traduzirErroCpfCnpj(new CpfCnpjError("h", 0, 6, 503), mapa)).toContain(
      "temporariamente indisponível",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("h", 0, 6, 429), mapa)).toContain(
      "limite de requisições",
    );
    expect(traduzirErroCpfCnpj(new CpfCnpjError("h", 0, 6, 0), mapa)).toContain(
      "falha de rede",
    );
  });

  it("código desconhecido com status não classificado vira erro genérico", () => {
    const msg = traduzirErroCpfCnpj(new CpfCnpjError("x", 0, 6, 418), mapa);
    expect(msg).toContain("erro inesperado");
    // não vaza o status cru nem o token
    expect(msg).not.toContain("418");
  });

  it("erro não-CpfCnpj preserva a mensagem original", () => {
    const msg = traduzirErroCpfCnpj(new Error("algo explodiu"), mapa);
    expect(msg).toContain("algo explodiu");
  });
});
