/**
 * Prompt: analise-cnpj
 *
 * Workflow guiado que instrui o LLM a chamar consultar_cnpj e produzir
 * uma análise interpretada (setor, idade, situação, risco aparente).
 *
 * MCP Prompts são diferentes de Tools: o cliente (Claude Desktop) exibe
 * como botão / atalho que injeta o conteúdo na conversa. O LLM lê a
 * mensagem injetada e decide chamar tools daí pra frente.
 *
 * Argumentos de prompts MCP são strings (vêm de UI como text input).
 */

import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const analiseCnpjArgsSchema = {
  cnpj: z
    .string()
    .describe(
      "CNPJ da empresa a analisar (com ou sem máscara). Ex: 33.000.167/0001-01",
    ),
};

export const analiseCnpjPrompt = {
  name: "analise-cnpj",
  title: "Analisar empresa por CNPJ",
  description:
    "Workflow guiado: consulta os dados cadastrais do CNPJ na Receita Federal e produz uma análise interpretada — setor de atuação (CNAE principal), idade da empresa, situação cadastral, porte, quadro societário e observações relevantes.",
  argsSchema: analiseCnpjArgsSchema,
};

export function analiseCnpjHandler(args: { cnpj: string }): GetPromptResult {
  const cnpj = args.cnpj.trim();
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Faça uma análise completa da empresa de CNPJ ${cnpj}.`,
            "",
            "Passos:",
            `1. Chame a tool consultar_cnpj com o CNPJ ${cnpj}.`,
            "2. Com base nos dados retornados, produza uma análise estruturada cobrindo:",
            "   - **Identificação**: razão social, nome fantasia.",
            "   - **Situação cadastral**: ativa/baixada/suspensa, motivo se aplicável, data.",
            "   - **Idade**: anos desde a abertura (calcule a partir da data de início).",
            "   - **Porte**: MEI/ME/EPP/Demais, capital social.",
            "   - **Atividade**: CNAE principal traduzido em linguagem simples + secundários relevantes.",
            "   - **Localização**: cidade/UF.",
            "   - **Quadro societário (QSA)**: número de sócios, principais.",
            "   - **Observações**: empresa Simples Nacional? MEI? Algo que chame atenção (situação irregular, idade incomum, atividade restrita)?",
            "",
            "Seja objetivo. Não recomende decisões de negócio — só apresente os fatos extraídos.",
          ].join("\n"),
        },
      },
    ],
  };
}
