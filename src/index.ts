#!/usr/bin/env node
/**
 * Entry point do brasil-data-mcp.
 *
 * Boot:
 *   1. Cria um McpServer (high-level API do SDK 1.x).
 *   2. Registra tools via registerTool — o SDK deriva o JSON Schema do schema
 *      Zod automaticamente, então atendemos o requisito de "validação dupla"
 *      (Zod runtime + JSON Schema na definição) com uma única declaração.
 *   3. Conecta no StdioServerTransport e fica em loop atendendo requisições
 *      do cliente MCP (Claude Desktop / Code / Cursor / etc).
 *
 * REGRA CRÍTICA: nunca escrever em stdout fora do protocolo. Todo log vai pro
 * stderr via console.error. console.log corrompe o canal e quebra tudo.
 *
 * REGISTRY: adicionar tool nova = uma chamada de registerTool a mais. Sem
 * mais nada. Mantém a "uma linha por tool" do brief original mesmo na API
 * high-level.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  consultarCnpjHandler,
  consultarCnpjSchema,
  consultarCnpjTool,
} from "./tools/cnpj.js";

const VERSION = "0.1.0";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "brasil-data-mcp",
    version: VERSION,
  });

  server.registerTool(
    consultarCnpjTool.name,
    {
      description: consultarCnpjTool.description,
      inputSchema: consultarCnpjSchema.shape,
    },
    async (input) => {
      // Try/catch defensivo: bug numa tool específica não pode derrubar o
      // server inteiro. Devolve erro estruturado que o cliente MCP entende.
      try {
        return await consultarCnpjHandler(input);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `Erro interno na tool consultar_cnpj: ${msg}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr, NÃO stdout. stdout é o canal MCP.
  console.error(`[brasil-data-mcp] v${VERSION} iniciado via stdio`);
}

main().catch((err) => {
  console.error("[brasil-data-mcp] falha fatal:", err);
  process.exit(1);
});
