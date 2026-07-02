/**
 * Fonte única da versão do pacote, lida do package.json em runtime.
 *
 * Antes, "0.2.0" vivia hardcoded em 3 lugares (package.json, index.ts,
 * USER_AGENT do cliente HTTP) e cada release exigia lembrar dos três.
 * Agora o package.json é a única fonte; os demais importam daqui.
 *
 * "../package.json" resolve correto nos DOIS layouts (ambos 1 nível
 * abaixo da raiz):
 *   dev/teste: src/version.ts → raiz do repo
 *   produção:  dist/index.js (version.ts inlined pelo tsup) → raiz do
 *              pacote npm (package.json sempre vai no tarball)
 */

import { readFileSync } from "node:fs";

function lerVersao(): string {
  try {
    const raw = readFileSync(
      new URL("../package.json", import.meta.url),
      "utf-8",
    );
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    // Metadado nunca derruba o server.
    return "0.0.0";
  }
}

export const VERSION = lerVersao();
