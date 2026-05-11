import { describe, expect, it } from "vitest";

import { analiseCnpjHandler } from "../../src/prompts/analise-cnpj.js";

describe("prompt analise-cnpj", () => {
  it("gera mensagem user contendo o CNPJ e instrução para consultar_cnpj", () => {
    const r = analiseCnpjHandler({ cnpj: "33.000.167/0001-01" });

    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]!.role).toBe("user");

    const content = r.messages[0]!.content;
    expect(content.type).toBe("text");
    const text = (content as { type: "text"; text: string }).text;

    expect(text).toContain("33.000.167/0001-01");
    expect(text).toContain("consultar_cnpj");
    expect(text).toContain("Situação cadastral");
  });

  it("não recomenda decisão de negócio", () => {
    const r = analiseCnpjHandler({ cnpj: "12345678000190" });
    const text = (r.messages[0]!.content as { text: string }).text;
    expect(text.toLowerCase()).toContain("não recomende");
  });
});
