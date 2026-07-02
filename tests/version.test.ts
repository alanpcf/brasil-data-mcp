import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { VERSION } from "../src/version.js";

describe("VERSION", () => {
  it("bate com a versão do package.json", () => {
    // Mesmo mecanismo de resolução do src/version.ts: tests/ também está
    // 1 nível abaixo da raiz do repo.
    const raw = readFileSync(
      new URL("../package.json", import.meta.url),
      "utf-8",
    );
    const pkg = JSON.parse(raw) as { version: string };

    expect(VERSION).toBe(pkg.version);
  });

  it("segue formato semver", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
