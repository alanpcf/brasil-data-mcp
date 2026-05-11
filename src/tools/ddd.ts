/**
 * Tool: consultar_ddd
 *
 * Lista cidades atendidas por um código DDD brasileiro via BrasilAPI.
 * Endpoint: /ddd/v1/{ddd}
 *
 * DDD brasileiro tem 2 dígitos, faixa 11..99 (com várias lacunas).
 * BrasilAPI devolve 404 pra DDDs que não existem no plano de numeração.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarDddSchema = z.object({
  ddd: z
    .union([z.string(), z.number()])
    .describe(
      "Código DDD brasileiro (2 dígitos). Aceita string ou número. Ex: 11 (São Paulo capital), 21 (Rio), 41 (Curitiba), 71 (Salvador).",
    ),
});

type ConsultarDddInput = z.infer<typeof consultarDddSchema>;

export const consultarDddTool = {
  name: "consultar_ddd",
  description: [
    "Lista as cidades atendidas por um código DDD brasileiro via BrasilAPI.",
    "",
    "Retorna em JSON: estado (UF) e lista de cidades que usam aquele DDD.",
    "",
    "Use quando o usuário perguntar de onde é um DDD, quais cidades um DDD cobre, ou descobrir o estado de um número de telefone.",
    "",
    "NÃO use para: validar número de telefone completo, descobrir DDD a partir de cidade (a operação só é DDD → cidades), ou consultar DDDs internacionais.",
  ].join(" "),
  inputSchema: consultarDddSchema,
};

function normalizarDdd(ddd: string | number): string {
  const s = String(ddd).trim().replace(/\D/g, "");
  // DDD brasileiro é sempre 2 dígitos, primeiro entre 1 e 9.
  if (!/^[1-9]\d$/.test(s)) return "";
  return s;
}

export async function consultarDddHandler(
  input: ConsultarDddInput,
): Promise<CallToolResult> {
  const ddd = normalizarDdd(input.ddd);

  if (!ddd) {
    return {
      content: [
        {
          type: "text",
          text: `DDD inválido: '${input.ddd}'. Deve ter 2 dígitos, primeiro entre 1 e 9 (ex: 11, 21, 41).`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/ddd/v1/${ddd}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `DDD ${ddd} não encontrado no plano de numeração brasileiro.`,
            contextoErro: "Erro ao consultar DDD",
          }),
        },
      ],
      isError: true,
    };
  }
}
