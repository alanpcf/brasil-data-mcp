#!/usr/bin/env node
/**
 * Entry point do brasil-data-mcp.
 *
 * Boot:
 *   1. Cria um McpServer (high-level API do SDK 1.x).
 *   2. Registra cada tool do array TOOLS — o SDK deriva o JSON Schema do
 *      schema Zod, então atendemos "validação dupla" (Zod runtime + JSON
 *      Schema na definição) com uma única declaração por tool.
 *   3. Registra prompts (workflows) via registerPrompt.
 *   4. Conecta no StdioServerTransport e fica em loop atendendo requisições.
 *
 * REGRA CRÍTICA: nunca escrever em stdout fora do protocolo. Logs em stderr
 * via console.error. console.log corrompe o canal MCP.
 *
 * REGISTRY: adicionar tool nova = uma entrada no array TOOLS. O loop de
 * registro aplica o wrapHandler (try/catch defensivo padronizado — bug numa
 * tool não derruba o server) uniformemente, sem risco de esquecer.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { cpfcnpjHabilitado } from "./clients/cpfcnpj.js";
import {
  analiseCnpjArgsSchema,
  analiseCnpjHandler,
  analiseCnpjPrompt,
} from "./prompts/analise-cnpj.js";
import {
  panoramaEconomicoHandler,
  panoramaEconomicoPrompt,
} from "./prompts/panorama-economico.js";
import { toolsAtivas } from "./tools/registry.js";
import { VERSION } from "./version.js";

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

  const habilitado = cpfcnpjHabilitado();
  if (habilitado) {
    console.error(
      "[brasil-data-mcp] provedor cpfcnpj.com.br habilitado (tools premium: consultar_cpf, consultar_inscricao_estadual)",
    );
  }

  for (const { tool, handler } of toolsAtivas(habilitado)) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
      },
      wrapHandler(tool.name, handler),
    );
  }

  // Prompts (workflows guiados). Não passam por wrapHandler porque
  // handler de prompt é síncrono no nosso uso e o SDK propaga exceções
  // do callback como erro do request, o que é aceitável.
  server.registerPrompt(
    analiseCnpjPrompt.name,
    {
      title: analiseCnpjPrompt.title,
      description: analiseCnpjPrompt.description,
      argsSchema: analiseCnpjArgsSchema,
    },
    analiseCnpjHandler,
  );

  server.registerPrompt(
    panoramaEconomicoPrompt.name,
    {
      title: panoramaEconomicoPrompt.title,
      description: panoramaEconomicoPrompt.description,
    },
    panoramaEconomicoHandler,
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
