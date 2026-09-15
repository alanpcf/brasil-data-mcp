import { describe, expect, it } from "vitest";

import { limparCpf, validarCpf } from "../../src/utils/cpf.js";

describe("limparCpf", () => {
  it("remove máscara e mantém só dígitos", () => {
    expect(limparCpf("111.444.777-35")).toBe("11144477735");
    expect(limparCpf("111 444 777 35")).toBe("11144477735");
  });
});

describe("validarCpf", () => {
  it("aceita CPF com dígitos verificadores corretos", () => {
    expect(validarCpf("11144477735")).toBe(true);
  });

  it("aceita CPF com máscara depois de limpo", () => {
    expect(validarCpf(limparCpf("111.444.777-35"))).toBe(true);
  });

  it("rejeita comprimento diferente de 11", () => {
    expect(validarCpf("1114447773")).toBe(false);
    expect(validarCpf("111444777350")).toBe(false);
  });

  it("rejeita sequência repetida", () => {
    expect(validarCpf("00000000000")).toBe(false);
    expect(validarCpf("11111111111")).toBe(false);
  });

  it("rejeita dígito verificador errado", () => {
    expect(validarCpf("11144477730")).toBe(false);
    expect(validarCpf("12345678900")).toBe(false);
  });

  it("rejeita entrada com letras", () => {
    expect(validarCpf("1114447773A")).toBe(false);
  });
});
