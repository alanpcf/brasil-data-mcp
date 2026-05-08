import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Sem watch por padrão; CI e dev local usam scripts dedicados.
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts é o bootstrap (stdio + registry). Tem fluxo top-level que
      // só roda em produção; cobrir 100% via teste artificial dá pouco
      // valor e atrapalha o threshold geral. Excluído do gate.
      exclude: ["src/index.ts"],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
