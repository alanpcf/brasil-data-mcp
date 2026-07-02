/**
 * Tools: listar_estados e consultar_municipios
 *
 * Divisão territorial brasileira (IBGE) via BrasilAPI.
 *
 * Endpoints:
 *   - /ibge/uf/v1              → 27 UFs com código IBGE, sigla, nome e região
 *   - /ibge/municipios/v1/{uf} → municípios da UF com nome e código IBGE
 *
 * Payload: municípios de estados grandes são listas longas (SP ≈ 645 itens,
 * ~30KB), mas cada item é minúsculo ({nome, codigo_ibge}) — aceitável pra
 * contexto de LLM; a descrição da tool avisa.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

const UFS_VALIDAS = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

// === listar_estados ===

export const listarEstadosSchema = z.object({});

type ListarEstadosInput = z.infer<typeof listarEstadosSchema>;

export const listarEstadosTool = {
  name: "listar_estados",
  description: [
    "Lista as 27 unidades federativas do Brasil (26 estados + DF) com dados do IBGE, via BrasilAPI.",
    "",
    "Retorna em JSON um array com id (código IBGE), sigla, nome, região (Norte/Nordeste/Centro-Oeste/Sudeste/Sul) e capital de cada UF.",
    "",
    "Use quando o usuário precisar do código IBGE de um estado, agrupar estados por região, validar siglas de UF ou saber a capital.",
    "",
    "NÃO use para: municípios (use consultar_municipios), dados demográficos ou populacionais (não estão nesta API).",
  ].join(" "),
  inputSchema: listarEstadosSchema,
};

export async function listarEstadosHandler(
  _input: ListarEstadosInput,
): Promise<CallToolResult> {
  try {
    const dados = await brasilApi.get<unknown>("/ibge/uf/v1");
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: "Lista de estados não disponível no momento.",
            contextoErro: "Erro ao listar estados",
          }),
        },
      ],
      isError: true,
    };
  }
}

// === consultar_municipios ===

export const consultarMunicipiosSchema = z.object({
  uf: z
    .string()
    .describe(
      "Sigla da unidade federativa, 2 letras, case-insensitive. Ex: 'SP', 'rj', 'DF'.",
    ),
});

type ConsultarMunicipiosInput = z.infer<typeof consultarMunicipiosSchema>;

export const consultarMunicipiosTool = {
  name: "consultar_municipios",
  description: [
    "Lista todos os municípios de uma UF brasileira com nome e código IBGE de 7 dígitos, via BrasilAPI.",
    "",
    "Retorna em JSON um array de {nome, codigo_ibge}. Atenção: estados grandes retornam listas longas (SP tem 645 municípios, ~30KB) — prefira usar só quando precisar da lista ou do código de um município.",
    "",
    "Use quando o usuário precisar do código IBGE de um município ou listar as cidades de um estado.",
    "",
    "NÃO use para: buscar um município por nome no país inteiro (a API só filtra por UF — se souber o estado, consulte-o), endereços/CEP (use consultar_cep), ou dados populacionais.",
  ].join(" "),
  inputSchema: consultarMunicipiosSchema,
};

export async function consultarMunicipiosHandler(
  input: ConsultarMunicipiosInput,
): Promise<CallToolResult> {
  const uf = input.uf.trim().toUpperCase();

  if (!UFS_VALIDAS.has(uf)) {
    return {
      content: [
        {
          type: "text",
          text: `UF inválida: '${input.uf}'. Use uma sigla de estado brasileiro, ex: SP, RJ, MG.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/ibge/municipios/v1/${uf}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Municípios da UF ${uf} não encontrados.`,
            contextoErro: "Erro ao consultar municípios",
          }),
        },
      ],
      isError: true,
    };
  }
}
