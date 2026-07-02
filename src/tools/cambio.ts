/**
 * Tools: consultar_cambio e listar_moedas
 *
 * Cotações de câmbio oficiais (boletins PTAX/BACEN) via BrasilAPI.
 *
 * Endpoints:
 *   - /cambio/v1/cotacao/{moeda}/{data} → boletins do dia (abertura,
 *     intermediários, fechamento) com compra/venda em BRL
 *   - /cambio/v1/moedas                 → moedas suportadas
 *
 * Comportamentos verificados da API:
 *   - Em data sem pregão (fim de semana, feriado) ela devolve as cotações do
 *     ÚLTIMO DIA ÚTIL anterior — a resposta traz data_hora_cotacao real.
 *     Por isso não há walk-back no cliente.
 *   - O DIA CORRENTE não é consultável: retorna 400 NO_TODAY_DATE ("política
 *     de cache"). Por isso o default com data omitida é ONTEM (a cotação
 *     mais recente disponível), e data == hoje é rejeitada localmente com
 *     explicação.
 *
 * TTL: default de 24h do cliente — toda data consultável é passada, e
 * boletim de dia encerrado é imutável.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

const MOEDAS_VALIDAS = new Set([
  "AUD",
  "CAD",
  "CHF",
  "DKK",
  "EUR",
  "GBP",
  "JPY",
  "NOK",
  "SEK",
  "USD",
]);

/**
 * Data de hoje (YYYY-MM-DD) no fuso de Brasília. NUNCA usar
 * new Date().toISOString(): entre ~21h e 0h BRT a data UTC já virou o dia
 * seguinte e a API rejeitaria como "data futura".
 */
function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Dia anterior a uma data ISO — aritmética em UTC ao meio-dia (sem fuso). */
function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Normaliza a data pra ISO YYYY-MM-DD. Aceita também DD/MM/YYYY (cortesia,
 * análogo ao CNPJ com/sem máscara). Retorna null pra formato inválido ou
 * data que não existe no calendário (ex: 2026-02-30) — validação por
 * round-trip UTC ao meio-dia pra não sofrer com fuso.
 */
function normalizarData(entrada: string): string | null {
  const s = entrada.trim();

  let iso: string;
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (brasileira) {
    iso = `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    iso = s;
  } else {
    return null;
  }

  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    return null;
  }
  return iso;
}

// === consultar_cambio ===

export const consultarCambioSchema = z.object({
  moeda: z
    .string()
    .describe(
      "Código da moeda (ISO 4217), case-insensitive. Aceitas: USD, EUR, GBP, JPY, CHF, CAD, AUD, DKK, NOK, SEK. Ex: 'USD'.",
    ),
  data: z
    .string()
    .optional()
    .describe(
      "Data da cotação no formato YYYY-MM-DD (aceita também DD/MM/YYYY). Se omitida, usa ontem (fuso de Brasília) — a fonte não expõe o dia corrente. Em data sem pregão (fim de semana, feriado) a API retorna as cotações do último dia útil anterior.",
    ),
});

type ConsultarCambioInput = z.infer<typeof consultarCambioSchema>;

export const consultarCambioTool = {
  name: "consultar_cambio",
  description: [
    "Consulta a cotação de câmbio oficial de uma moeda estrangeira em relação ao Real (BRL) numa data, via boletins PTAX do Banco Central (BrasilAPI).",
    "",
    "Retorna em JSON os boletins do dia (ABERTURA, INTERMEDIÁRIO, FECHAMENTO) com cotação de compra e venda em BRL, paridade e data_hora_cotacao. A fonte NÃO expõe o dia corrente: com data omitida a tool consulta ontem (a cotação mais recente disponível), e em data sem pregão a API retorna os boletins do último dia útil anterior.",
    "",
    "Use quando o usuário perguntar 'quanto tá o dólar?' (retorna a cotação mais recente, do dia útil anterior), 'cotação do euro em 26/06', 'quanto fechou a libra sexta-feira' — qualquer pergunta sobre valor de moeda estrangeira em reais.",
    "",
    "NÃO use para: criptomoedas (não está nesta API), BRL (é a moeda base), série histórica (uma data por chamada), ou moedas fora das 10 suportadas — pra descobrir as moedas disponíveis use listar_moedas.",
  ].join(" "),
  inputSchema: consultarCambioSchema,
};

export async function consultarCambioHandler(
  input: ConsultarCambioInput,
): Promise<CallToolResult> {
  const moeda = input.moeda.trim().toUpperCase();

  if (!MOEDAS_VALIDAS.has(moeda)) {
    return {
      content: [
        {
          type: "text",
          text: `Moeda não suportada: '${input.moeda}'. Use uma de: ${[...MOEDAS_VALIDAS].join(", ")}.`,
        },
      ],
      isError: true,
    };
  }

  const hoje = hojeSaoPaulo();
  const ontem = diaAnterior(hoje);
  let data: string;
  if (input.data === undefined) {
    // A fonte não expõe o dia corrente (400 NO_TODAY_DATE) — a cotação mais
    // recente disponível é sempre a de ontem.
    data = ontem;
  } else {
    const normalizada = normalizarData(input.data);
    if (normalizada === null) {
      return {
        content: [
          {
            type: "text",
            text: `Data inválida: '${input.data}'. Use o formato YYYY-MM-DD (ex: ${ontem}) ou DD/MM/YYYY.`,
          },
        ],
        isError: true,
      };
    }
    data = normalizada;
  }

  // Comparação lexicográfica funciona pra datas ISO. Hoje também é
  // rejeitado: a BrasilAPI retorna 400 NO_TODAY_DATE pro dia corrente.
  if (data >= hoje) {
    return {
      content: [
        {
          type: "text",
          text: `A fonte não fornece cotação do dia corrente nem de datas futuras ('${data}'). A cotação mais recente disponível é a de ${ontem} — omita 'data' pra usá-la.`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Toda data consultável é passada (boletins encerrados, imutáveis) —
    // TTL default de 24h do cliente.
    const dados = await brasilApi.get<unknown>(
      `/cambio/v1/cotacao/${moeda}/${data}`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Cotação de ${moeda} não encontrada para ${data}.`,
            contextoErro: "Erro ao consultar câmbio",
          }),
        },
      ],
      isError: true,
    };
  }
}

// === listar_moedas ===

export const listarMoedasSchema = z.object({});

type ListarMoedasInput = z.infer<typeof listarMoedasSchema>;

export const listarMoedasTool = {
  name: "listar_moedas",
  description: [
    "Lista as moedas estrangeiras com cotação disponível na BrasilAPI (boletins PTAX/BACEN).",
    "",
    "Retorna em JSON um array com símbolo (ISO 4217), nome e tipo de cada moeda — 10 moedas: USD, EUR, GBP, JPY, CHF, CAD, AUD, DKK, NOK, SEK.",
    "",
    "Use quando o usuário quiser saber quais moedas têm cotação disponível ou não souber o código da moeda.",
    "",
    "NÃO use para obter a cotação em si — use consultar_cambio.",
  ].join(" "),
  inputSchema: listarMoedasSchema,
};

export async function listarMoedasHandler(
  _input: ListarMoedasInput,
): Promise<CallToolResult> {
  try {
    const dados = await brasilApi.get<unknown>("/cambio/v1/moedas");
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: "Lista de moedas não disponível no momento.",
            contextoErro: "Erro ao listar moedas",
          }),
        },
      ],
      isError: true,
    };
  }
}
