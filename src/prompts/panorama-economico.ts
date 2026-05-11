/**
 * Prompt: panorama-economico
 *
 * Workflow zero-arg que combina listar_taxas + consultar_feriados pra
 * gerar um snapshot do "estado econômico/calendário" brasileiro útil
 * pra planejar reuniões, decisões financeiras curtas, etc.
 */

import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export const panoramaEconomicoPrompt = {
  name: "panorama-economico",
  title: "Panorama econômico e de feriados",
  description:
    "Workflow guiado: lista as taxas econômicas atuais (SELIC, CDI, IPCA) e os feriados nacionais do ano corrente, e produz um resumo conciso útil pra planejamento de curto prazo (próximos feriados, juros vigentes).",
  // argsSchema omitido = prompt sem argumentos.
};

export function panoramaEconomicoHandler(): GetPromptResult {
  const anoCorrente = new Date().getFullYear();
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Monte um panorama econômico e de calendário do Brasil no momento.",
            "",
            "Passos:",
            "1. Chame a tool listar_taxas pra obter SELIC, CDI e IPCA atuais.",
            `2. Chame a tool consultar_feriados com ano=${anoCorrente}.`,
            "3. Produza um resumo curto cobrindo:",
            "   - **Taxas vigentes**: SELIC, CDI, IPCA (% ao ano), com uma frase de contexto cada (ex: 'SELIC é a taxa básica de juros').",
            "   - **Próximos feriados**: a partir de hoje, liste os 3-5 próximos feriados nacionais com data e dia da semana.",
            "   - **Pontes em vista**: aponte feriados que caem em terça/quinta (potencial emenda).",
            "",
            "Seja conciso. Não dê recomendação de investimento.",
          ].join("\n"),
        },
      },
    ],
  };
}
