import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Sem watch por padrão; CI e dev local usam scripts dedicados.
  },
});
