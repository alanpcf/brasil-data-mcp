/**
 * Tool: consultar_cnpj
 *
 * Consulta dados cadastrais de um CNPJ na Receita Federal via BrasilAPI.
 * Endpoint: /cnpj/v1/{cnpj}
 *
 * Padrão deste arquivo (replicar nas próximas tools):
 *   1. Schema Zod com .describe() em cada campo (vira parte do JSON Schema
 *      auto-gerado pelo SDK e ajuda o LLM a entender o input).
 *   2. Helpers de validação locais (limpar, validar) ANTES de bater na rede.
 *   3. Handler que retorna { content, isError } no formato MCP.
 *   4. Erros HTTP traduzidos pra mensagens em PT — o LLM nunca vê 404 cru.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { limparCnpj, validarCnpj } from "../utils/cnpj.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarCnpjSchema = z.object({
  cnpj: z
    .string()
    .describe(
      "CNPJ da empresa, com ou sem máscara. Aceita '12.345.678/0001-90' ou '12345678000190'. Deve ter 14 dígitos.",
    ),
});

type ConsultarCnpjInput = z.infer<typeof consultarCnpjSchema>;

export const consultarCnpjTool = {
  name: "consultar_cnpj",
  // Descrição é PRODUTO: é o que o LLM lê pra decidir quando chamar.
  // Explicita o que retorna, quando usar e quando NÃO usar.
  description: [
    "Consulta dados cadastrais de uma empresa brasileira pelo CNPJ na Receita Federal (via BrasilAPI).",
    "",
    "Retorna em JSON: razão social, nome fantasia, situação cadastral (ativa/baixada/etc), data de abertura, ",
    "endereço completo, CNAE principal e secundários, sócios (QSA), capital social, natureza jurídica, ",
    "porte (MEI/ME/EPP/Demais), telefones, e-mail, simples nacional/MEI.",
    "",
    "Use quando o usuário pedir informações sobre uma empresa identificada por CNPJ.",
    "",
    "NÃO use para: CPF (pessoa física), empresas estrangeiras, ou validação local de formato ",
    "(rejeite formato inválido sem chamar a tool). Aceita CNPJ com ou sem máscara.",
  ].join(" "),
  inputSchema: consultarCnpjSchema,
};

export async function consultarCnpjHandler(
  input: ConsultarCnpjInput,
): Promise<CallToolResult> {
  const cnpjLimpo = limparCnpj(input.cnpj);

  if (!validarCnpj(cnpjLimpo)) {
    return {
      content: [
        {
          type: "text",
          text: `CNPJ inválido: '${input.cnpj}'. Deve conter 14 dígitos (com ou sem máscara) e não pode ser uma sequência repetida.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/cnpj/v1/${cnpjLimpo}`);
    return {
      content: [
        {
          type: "text",
          // JSON estruturado, não texto livre — o modelo extrai campos com
          // mais confiabilidade quando recebe JSON.
          text: JSON.stringify(dados, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `CNPJ ${cnpjLimpo} não encontrado na base da Receita Federal. Verifique se está correto.`,
            contextoErro: "Erro ao consultar CNPJ",
          }),
        },
      ],
      isError: true,
    };
  }
}
