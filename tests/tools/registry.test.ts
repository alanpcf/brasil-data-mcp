import { describe, expect, it } from "vitest";

import { TOOLS, TOOLS_PREMIUM, toolsAtivas } from "../../src/tools/registry.js";

describe("toolsAtivas", () => {
  it("sem provedor: só as 15 tools base", () => {
    const ativas = toolsAtivas(false);
    expect(ativas).toHaveLength(TOOLS.length);
    expect(ativas).toHaveLength(15);
    const nomes = ativas.map((t) => t.tool.name);
    expect(nomes).not.toContain("consultar_cpf");
    expect(nomes).not.toContain("consultar_inscricao_estadual");
  });

  it("com provedor: base + premium, sem alterar a ordem base", () => {
    const ativas = toolsAtivas(true);
    expect(ativas).toHaveLength(TOOLS.length + TOOLS_PREMIUM.length);
    const nomes = ativas.map((t) => t.tool.name);
    expect(nomes).toContain("consultar_cpf");
    expect(nomes).toContain("consultar_inscricao_estadual");
    // Premium entra no fim.
    expect(nomes[0]).toBe("consultar_cnpj");
    expect(nomes.at(-1)).toBe("consultar_inscricao_estadual");
  });

  it("todos os nomes de tool são únicos", () => {
    const nomes = toolsAtivas(true).map((t) => t.tool.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
