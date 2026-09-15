/**
 * Registro declarativo das tools do servidor.
 *
 * Separado de index.ts (que é o bootstrap stdio, excluído da cobertura) para
 * que a seleção condicional de tools seja uma função PURA e testável sem subir
 * o transporte MCP. index.ts apenas itera o resultado de toolsAtivas().
 *
 * Ordem de registro preservada entre releases (minimiza diff no tools/list).
 * Tools novas entram no fim. As tools premium do provedor cpfcnpj.com.br só
 * entram quando o token está configurado.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import {
  consultarBancoHandler,
  consultarBancoTool,
  listarBancosHandler,
  listarBancosTool,
} from "./banco.js";
import {
  consultarCambioHandler,
  consultarCambioTool,
  listarMoedasHandler,
  listarMoedasTool,
} from "./cambio.js";
import { consultarCepHandler, consultarCepTool } from "./cep.js";
import { consultarCnpjHandler, consultarCnpjTool } from "./cnpj.js";
import {
  consultarCorretoraHandler,
  consultarCorretoraTool,
} from "./corretoras.js";
import { consultarCpfHandler, consultarCpfTool } from "./cpf.js";
import { consultarDddHandler, consultarDddTool } from "./ddd.js";
import {
  consultarDominioBrHandler,
  consultarDominioBrTool,
} from "./dominio.js";
import {
  consultarFeriadosHandler,
  consultarFeriadosTool,
} from "./feriados.js";
import {
  consultarInscricaoEstadualHandler,
  consultarInscricaoEstadualTool,
} from "./inscricao-estadual.js";
import {
  consultarMunicipiosHandler,
  consultarMunicipiosTool,
  listarEstadosHandler,
  listarEstadosTool,
} from "./ibge.js";
import { consultarIsbnHandler, consultarIsbnTool } from "./isbn.js";
import {
  consultarTaxaHandler,
  consultarTaxaTool,
  listarTaxasHandler,
  listarTaxasTool,
} from "./taxas.js";

export interface DefinicaoTool {
  tool: { name: string; description: string; inputSchema: z.AnyZodObject };
  // O input é `any` de propósito na fronteira do registry: um array
  // heterogêneo não correlaciona schema[i] ↔ handler[i] sem existential
  // types. Cada handler segue 100% tipado no seu módulo, e o SDK valida o
  // input contra o schema Zod ANTES de invocar o handler.
  handler: (input: any) => Promise<CallToolResult>;
}

export const TOOLS: DefinicaoTool[] = [
  { tool: consultarCnpjTool, handler: consultarCnpjHandler },
  { tool: consultarCepTool, handler: consultarCepHandler },
  { tool: consultarBancoTool, handler: consultarBancoHandler },
  { tool: listarBancosTool, handler: listarBancosHandler },
  { tool: consultarFeriadosTool, handler: consultarFeriadosHandler },
  { tool: consultarDddTool, handler: consultarDddHandler },
  { tool: consultarIsbnTool, handler: consultarIsbnHandler },
  { tool: consultarTaxaTool, handler: consultarTaxaHandler },
  { tool: listarTaxasTool, handler: listarTaxasHandler },
  { tool: consultarCorretoraTool, handler: consultarCorretoraHandler },
  // Fase 5 (v0.3.0):
  { tool: consultarCambioTool, handler: consultarCambioHandler },
  { tool: listarMoedasTool, handler: listarMoedasHandler },
  { tool: listarEstadosTool, handler: listarEstadosHandler },
  { tool: consultarMunicipiosTool, handler: consultarMunicipiosHandler },
  { tool: consultarDominioBrTool, handler: consultarDominioBrHandler },
];

// Tools do provedor premium cpfcnpj.com.br. Só entram no servidor quando o
// token está configurado (ver toolsAtivas).
export const TOOLS_PREMIUM: DefinicaoTool[] = [
  { tool: consultarCpfTool, handler: consultarCpfHandler },
  {
    tool: consultarInscricaoEstadualTool,
    handler: consultarInscricaoEstadualHandler,
  },
];

/** Lista de tools ativas conforme o provedor premium estar habilitado. */
export function toolsAtivas(habilitado: boolean): DefinicaoTool[] {
  return habilitado ? [...TOOLS, ...TOOLS_PREMIUM] : TOOLS;
}
