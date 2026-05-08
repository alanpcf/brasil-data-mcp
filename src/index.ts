#!/usr/bin/env node
/**
 * Entry point do brasil-data-mcp.
 *
 * Boot:
 *   1. Cria um McpServer (high-level API do SDK 1.x).
 *   2. Registra cada tool via registerTool — o SDK deriva o JSON Schema do
 *      schema Zod, então atendemos "validação dupla" (Zod runtime + JSON
 *      Schema na definição) com uma única declaração por tool.
 *   3. Conecta no StdioServerTransport e fica em loop atendendo requisições.
 *
 * REGRA CRÍTICA: nunca escrever em stdout fora do protocolo. Logs em stderr
 * via console.error. console.log corrompe o canal MCP.
 *
 * REGISTRY: adicionar tool nova = uma chamada de registerTool. O helper
 * wrapHandler aplica o try/catch defensivo padronizado (bug numa tool não
 * derruba o server).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  consultarBancoHandler,
  consultarBancoSchema,
  consultarBancoTool,
  listarBancosHandler,
  listarBancosSchema,
  listarBancosTool,
} from "./tools/banco.js";
import {
  consultarCepHandler,
  consultarCepSchema,
  consultarCepTool,
} from "./tools/cep.js";
import {
  consultarCnpjHandler,
  consultarCnpjSchema,
  consultarCnpjTool,
} from "./tools/cnpj.js";
import {
  consultarFeriadosHandler,
  consultarFeriadosSchema,
  consultarFeriadosTool,
} from "./tools/feriados.js";

const VERSION = "0.1.0";

/**
 * Envolve o handler com try/catch padronizado. Erros não-tratados pela tool
 * não podem derrubar o server inteiro — viram resposta MCP estruturada.
 */
function wrapHandler<T>(
  toolName: string,
  handler: (input: T) => Promise<CallToolResult>,
): (input: T) => Promise<CallToolResult> {
  return async (input) => {
    try {
      return await handler(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Erro interno na tool ${toolName}: ${msg}`,
          },
        ],
        isError: true,
      };
    }
  };
}

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
    wrapHandler(consultarCnpjTool.name, consultarCnpjHandler),
  );

  server.registerTool(
    consultarCepTool.name,
    {
      description: consultarCepTool.description,
      inputSchema: consultarCepSchema.shape,
    },
    wrapHandler(consultarCepTool.name, consultarCepHandler),
  );

  server.registerTool(
    consultarBancoTool.name,
    {
      description: consultarBancoTool.description,
      inputSchema: consultarBancoSchema.shape,
    },
    wrapHandler(consultarBancoTool.name, consultarBancoHandler),
  );

  server.registerTool(
    listarBancosTool.name,
    {
      description: listarBancosTool.description,
      inputSchema: listarBancosSchema.shape,
    },
    wrapHandler(listarBancosTool.name, listarBancosHandler),
  );

  server.registerTool(
    consultarFeriadosTool.name,
    {
      description: consultarFeriadosTool.description,
      inputSchema: consultarFeriadosSchema.shape,
    },
    wrapHandler(consultarFeriadosTool.name, consultarFeriadosHandler),
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[brasil-data-mcp] v${VERSION} iniciado via stdio`);
}

main().catch((err) => {
  console.error("[brasil-data-mcp] falha fatal:", err);
  process.exit(1);
});
