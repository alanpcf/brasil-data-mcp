/**
 * Tool: consultar_feriados
 *
 * Lista feriados nacionais brasileiros de um ano via BrasilAPI.
 * Endpoint: /feriados/v1/{ano}
 *
 * Faixa aceita pela BrasilAPI: 1900..2199. Fora disso devolve 400.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarFeriadosSchema = z.object({
  ano: z
    .number()
    .int()
    .describe(
      "Ano dos feriados, 4 dígitos. Faixa aceita: 1900 a 2199. Ex: 2026.",
    ),
});

type ConsultarFeriadosInput = z.infer<typeof consultarFeriadosSchema>;

export const consultarFeriadosTool = {
  name: "consultar_feriados",
  description: [
    "Lista os feriados NACIONAIS brasileiros de um ano específico via BrasilAPI.",
    "",
    "Retorna em JSON um array com data (YYYY-MM-DD), nome do feriado e tipo (national/optional). Inclui feriados móveis calculados (Carnaval, Páscoa, Corpus Christi).",
    "",
    "Use quando o usuário perguntar quando cai um feriado, listar feriados do ano, planejar emendas/pontes, ou calcular dias úteis.",
    "",
    "NÃO use para: feriados estaduais ou municipais (a API só cobre nacionais), datas comemorativas sem dia de folga (Dia das Mães etc.), ou anos fora da faixa 1900-2199.",
  ].join(" "),
  inputSchema: consultarFeriadosSchema,
};

function validarAno(ano: number): boolean {
  // Faixa que a BrasilAPI suporta. Validamos local pra evitar round-trip.
  return Number.isInteger(ano) && ano >= 1900 && ano <= 2199;
}

export async function consultarFeriadosHandler(
  input: ConsultarFeriadosInput,
): Promise<CallToolResult> {
  if (!validarAno(input.ano)) {
    return {
      content: [
        {
          type: "text",
          text: `Ano inválido: ${input.ano}. Deve ser inteiro entre 1900 e 2199.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/feriados/v1/${input.ano}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Feriados de ${input.ano} não encontrados na base.`,
            contextoErro: "Erro ao consultar feriados",
          }),
        },
      ],
      isError: true,
    };
  }
}
