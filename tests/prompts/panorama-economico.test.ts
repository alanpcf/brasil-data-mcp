import { describe, expect, it } from "vitest";

import { panoramaEconomicoHandler } from "../../src/prompts/panorama-economico.js";

describe("prompt panorama-economico", () => {
  it("instrui o LLM a chamar listar_taxas e consultar_feriados", () => {
    const r = panoramaEconomicoHandler();

    expect(r.messages).toHaveLength(1);
    const text = (r.messages[0]!.content as { text: string }).text;

    expect(text).toContain("listar_taxas");
    expect(text).toContain("consultar_feriados");
  });

  it("usa o ano corrente no parâmetro de feriados", () => {
    const r = panoramaEconomicoHandler();
    const text = (r.messages[0]!.content as { text: string }).text;
    const anoAtual = new Date().getFullYear();
    expect(text).toContain(`ano=${anoAtual}`);
  });
});
