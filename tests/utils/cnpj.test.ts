import { describe, expect, it } from "vitest";

import {
  limparCnpj,
  limparCnpjAlfanumerico,
  validarCnpj,
  validarCnpjAlfanumerico,
} from "../../src/utils/cnpj.js";

describe("limparCnpj / validarCnpj (numérico, inalterados)", () => {
  it("limpa máscara mantendo só dígitos", () => {
    expect(limparCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("valida 14 dígitos e rejeita repetidos", () => {
    expect(validarCnpj("11222333000181")).toBe(true);
    expect(validarCnpj("11111111111111")).toBe(false);
    expect(validarCnpj("112223330001")).toBe(false);
  });
});

describe("limparCnpjAlfanumerico", () => {
  it("preserva letras (não usa \\D) e normaliza para maiúsculas", () => {
    expect(limparCnpjAlfanumerico("12abc34501de35")).toBe("12ABC34501DE35");
    expect(limparCnpjAlfanumerico("12.ABC.345/01DE-35")).toBe(
      "12ABC34501DE35",
    );
  });
});

describe("validarCnpjAlfanumerico", () => {
  it("aceita CNPJ alfanumérico válido (IN RFB 2.229/2024)", () => {
    expect(validarCnpjAlfanumerico("12ABC34501DE35")).toBe(true);
  });

  it("aceita CNPJ só numérico (subconjunto do alfanumérico)", () => {
    expect(validarCnpjAlfanumerico("11222333000181")).toBe(true);
  });

  it("normaliza minúsculas antes de validar", () => {
    expect(validarCnpjAlfanumerico(limparCnpjAlfanumerico("12abc34501de35"))).toBe(
      true,
    );
  });

  it("rejeita dígito verificador errado", () => {
    expect(validarCnpjAlfanumerico("12ABC34501DE34")).toBe(false);
    expect(validarCnpjAlfanumerico("11222333000180")).toBe(false);
  });

  it("rejeita DV não numérico e formato fora do padrão", () => {
    expect(validarCnpjAlfanumerico("12ABC34501DEAB")).toBe(false);
    expect(validarCnpjAlfanumerico("12ABC34501DE3")).toBe(false);
  });

  it("rejeita sequência repetida", () => {
    expect(validarCnpjAlfanumerico("AAAAAAAAAAAAAA")).toBe(false);
    expect(validarCnpjAlfanumerico("00000000000000")).toBe(false);
  });
});
