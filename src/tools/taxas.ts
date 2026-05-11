/**
 * Tools: consultar_taxa e listar_taxas
 *
 * Taxas de juros e índices econômicos oficiais (SELIC, CDI, IPCA) via BrasilAPI.
 *
 * Endpoints:
 *   - /taxas/v1            → array com todas as taxas
 *   - /taxas/v1/{sigla}    → taxa específica pela sigla (SELIC, CDI, IPCA)
 *
 * TTL: 1h (não 24h). Taxas podem ser atualizadas durante o dia útil pelo
 * BACEN, então cache muito longo dá valor velho. 1h é compromisso entre
 * fresh-enough e economia de round-trip dentro do mesmo turno do LLM.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

const TTL_TAXAS_MS = 60 * 60 * 1000; // 1h

// === consultar_taxa ===

export const consultarTaxaSchema = z.object({
  sigla: z
    .string()
    .describe(
      "Sigla da taxa, case-insensitive. Aceita: 'Selic' (taxa básica de juros), 'CDI' (Certificado de Depósito Interbancário), 'IPCA' (inflação oficial).",
    ),
});

type ConsultarTaxaInput = z.infer<typeof consultarTaxaSchema>;

export const consultarTaxaTool = {
  name: "consultar_taxa",
  description: [
    "Consulta o valor atual de uma taxa econômica brasileira (SELIC, CDI, IPCA) via BrasilAPI.",
    "",
    "Retorna em JSON: nome da taxa e valor atual (% ao ano).",
    "",
    "Use quando o usuário perguntar 'qual a SELIC hoje?', 'CDI atual?', 'inflação do IPCA?' — qualquer pergunta sobre o valor corrente de uma taxa específica.",
    "",
    "NÃO use para: série histórica (a API devolve só o último valor), outras taxas além de SELIC/CDI/IPCA, ou consultar dólar/bolsa (não está nesta API). Pra panorama com todas as 3 taxas use listar_taxas.",
  ].join(" "),
  inputSchema: consultarTaxaSchema,
};

const SIGLAS_VALIDAS = new Set(["SELIC", "CDI", "IPCA"]);

function normalizarSigla(sigla: string): string {
  return sigla.trim().toUpperCase();
}

export async function consultarTaxaHandler(
  input: ConsultarTaxaInput,
): Promise<CallToolResult> {
  const sigla = normalizarSigla(input.sigla);

  if (!SIGLAS_VALIDAS.has(sigla)) {
    return {
      content: [
        {
          type: "text",
          text: `Sigla inválida: '${input.sigla}'. Use uma de: SELIC, CDI, IPCA.`,
        },
      ],
      isError: true,
    };
  }

  try {
    // BrasilAPI espera 'Selic' capitalizado, mas aceita variações.
    // Usamos a sigla normalizada upper-case — funcional na prática.
    const dados = await brasilApi.get<unknown>(`/taxas/v1/${sigla}`, {
      ttlMs: TTL_TAXAS_MS,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Taxa ${sigla} não encontrada na BrasilAPI.`,
            contextoErro: "Erro ao consultar taxa",
          }),
        },
      ],
      isError: true,
    };
  }
}

// === listar_taxas ===

export const listarTaxasSchema = z.object({});

type ListarTaxasInput = z.infer<typeof listarTaxasSchema>;

export const listarTaxasTool = {
  name: "listar_taxas",
  description: [
    "Lista TODAS as taxas econômicas brasileiras disponíveis na BrasilAPI (SELIC, CDI, IPCA) com seus valores atuais.",
    "",
    "Retorna em JSON um array com nome e valor (% ao ano) de cada taxa.",
    "",
    "Use quando o usuário quiser um panorama econômico, comparar SELIC vs CDI vs IPCA, ou não souber a sigla específica.",
    "",
    "NÃO use quando o usuário já sabe qual taxa quer — use consultar_taxa que é semanticamente mais direto. Hoje são só 3 taxas; o payload é pequeno.",
  ].join(" "),
  inputSchema: listarTaxasSchema,
};

export async function listarTaxasHandler(
  _input: ListarTaxasInput,
): Promise<CallToolResult> {
  try {
    const dados = await brasilApi.get<unknown>("/taxas/v1", {
      ttlMs: TTL_TAXAS_MS,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: "Lista de taxas não disponível no momento.",
            contextoErro: "Erro ao listar taxas",
          }),
        },
      ],
      isError: true,
    };
  }
}
