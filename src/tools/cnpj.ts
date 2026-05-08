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
import { BrasilApiError, brasilApi } from "../clients/brasilapi.js";

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

/** Remove qualquer caractere não-dígito. */
function limparCnpj(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Valida formato básico do CNPJ:
 *   - exatamente 14 dígitos
 *   - não pode ser todos iguais (00000000000000, 11111111111111, ...).
 *     Esses passam no test de comprimento mas são CNPJs notórios usados em
 *     teste/sandbox e a Receita rejeita.
 *
 * Não valida dígitos verificadores aqui — a BrasilAPI já faz isso no servidor
 * e devolve 400 com mensagem clara, então duplicar a regra de DV no cliente
 * só duplica manutenção.
 */
function validarCnpj(s: string): boolean {
  if (!/^\d{14}$/.test(s)) return false;
  if (/^(\d)\1{13}$/.test(s)) return false;
  return true;
}

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
    if (err instanceof BrasilApiError && err.status === 404) {
      return {
        content: [
          {
            type: "text",
            text: `CNPJ ${cnpjLimpo} não encontrado na base da Receita Federal. Verifique se está correto.`,
          },
        ],
        isError: true,
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Erro ao consultar CNPJ: ${msg}` }],
      isError: true,
    };
  }
}
