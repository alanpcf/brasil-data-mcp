/**
 * Tools: consultar_banco e listar_bancos
 *
 * Duas tools no mesmo arquivo porque compartilham domínio (bancos brasileiros
 * cadastrados no BACEN) e usam o mesmo prefixo de endpoint. Foram separadas
 * em duas tools (em vez de uma com parâmetro opcional) pra deixar a
 * semântica clara pro LLM: "consultar" assume entrada concreta, "listar" não.
 *
 * Endpoints:
 *   - /banks/v1            → array com todos os bancos
 *   - /banks/v1/{code}     → banco específico pelo código (3 dígitos)
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

// === consultar_banco ===

export const consultarBancoSchema = z.object({
  codigo: z
    .union([z.string(), z.number()])
    .describe(
      "Código COMPE/Febraban do banco (1 a 4 dígitos). Aceita string ou número. Ex: 341 (Itaú), 260 (Nubank), 237 (Bradesco).",
    ),
});

type ConsultarBancoInput = z.infer<typeof consultarBancoSchema>;

export const consultarBancoTool = {
  name: "consultar_banco",
  description: [
    "Consulta os dados de um banco brasileiro pelo código COMPE/Febraban via BrasilAPI (fonte: BACEN).",
    "",
    "Retorna em JSON: nome curto, nome completo, código, ISPB (identificador no SPB).",
    "",
    "Use quando o usuário fornecer um código de banco e quiser saber o nome, ou quando precisar do ISPB pra montar um PIX/TED.",
    "",
    "NÃO use para: buscar banco por nome (use listar_bancos e filtre), validar conta corrente, ou consultar agência/conta. Códigos comuns: 001=BB, 104=CEF, 237=Bradesco, 341=Itaú, 260=Nubank, 077=Inter.",
  ].join(" "),
  inputSchema: consultarBancoSchema,
};

function normalizarCodigo(codigo: string | number): string {
  const s = String(codigo).trim();
  // Códigos COMPE têm de 1 a 4 dígitos. Normaliza removendo zeros à esquerda
  // só pra validar — a BrasilAPI aceita tanto "1" quanto "001".
  if (!/^\d{1,4}$/.test(s)) return "";
  return s;
}

export async function consultarBancoHandler(
  input: ConsultarBancoInput,
): Promise<CallToolResult> {
  const codigo = normalizarCodigo(input.codigo);

  if (!codigo) {
    return {
      content: [
        {
          type: "text",
          text: `Código de banco inválido: '${input.codigo}'. Deve ser numérico, de 1 a 4 dígitos.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/banks/v1/${codigo}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Banco com código ${codigo} não encontrado no cadastro do BACEN.`,
            contextoErro: "Erro ao consultar banco",
          }),
        },
      ],
      isError: true,
    };
  }
}

// === listar_bancos ===

export const listarBancosSchema = z.object({});

type ListarBancosInput = z.infer<typeof listarBancosSchema>;

export const listarBancosTool = {
  name: "listar_bancos",
  description: [
    "Lista TODOS os bancos brasileiros cadastrados no BACEN via BrasilAPI.",
    "",
    "Retorna em JSON um array com nome, código COMPE/Febraban e ISPB de cada instituição.",
    "",
    "Use quando o usuário quiser uma lista completa, buscar banco por nome (você filtra o resultado), ou descobrir o código de um banco específico cujo nome ele forneceu.",
    "",
    "NÃO use quando o usuário já forneceu o código numérico — nesse caso use consultar_banco que é mais barato. A lista tem ~250 entradas; cite só os relevantes na resposta.",
  ].join(" "),
  inputSchema: listarBancosSchema,
};

export async function listarBancosHandler(
  _input: ListarBancosInput,
): Promise<CallToolResult> {
  try {
    const dados = await brasilApi.get<unknown>("/banks/v1");
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            // Não há "404" semântico pra lista — se a API errar, todos
            // caem no mesmo balde de "indisponível".
            notFound: "Lista de bancos não disponível no momento.",
            contextoErro: "Erro ao listar bancos",
          }),
        },
      ],
      isError: true,
    };
  }
}
