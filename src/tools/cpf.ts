/**
 * Tool: consultar_cpf (provedor premium cpfcnpj.com.br, só com CPFCNPJ_TOKEN)
 *
 * Dados cadastrais de pessoa física na Receita Federal.
 * Endpoint: /{token}/1/{cpf} (básico) ou /{token}/3/{cpf} (completo).
 *
 * Segue o mesmo padrão de src/tools/cnpj.ts (schema Zod com .describe(),
 * validação local antes da rede, erros traduzidos em PT, JSON estruturado).
 * A tool só é registrada quando o provedor está habilitado.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { cpfcnpj } from "../clients/cpfcnpj.js";
import { limparCpf, validarCpf } from "../utils/cpf.js";
import { traduzirErroCpfCnpj } from "../utils/errors.js";

export const consultarCpfSchema = z.object({
  cpf: z
    .string()
    .describe(
      "CPF da pessoa física, com ou sem máscara. Aceita '000.000.000-00' ou '00000000000'. Deve ter 11 dígitos.",
    ),
  completo: z
    .boolean()
    .default(false)
    .describe(
      "false (padrão): retorna situação e nome (pacote 1, mais barato). true: retorna nome, nascimento, gênero e endereço atual + histórico (pacote 3).",
    ),
});

type ConsultarCpfInput = z.infer<typeof consultarCpfSchema>;

export const consultarCpfTool = {
  name: "consultar_cpf",
  // Descrição é PRODUTO, com aviso de LGPD porque é dado pessoal e cada
  // consulta tem custo na conta do usuário.
  description: [
    "Consulta dados cadastrais de uma pessoa física pelo CPF na Receita Federal (provedor premium cpfcnpj.com.br, requer CPFCNPJ_TOKEN).",
    "",
    "Retorna em JSON: nome e situação cadastral (básico) ou, com 'completo': nome, data de nascimento, gênero, ",
    "endereço atual e histórico de endereços.",
    "",
    "QUANDO USAR: validar existência e titularidade de um CPF que o próprio usuário informou, em contexto legítimo ",
    "(cadastro, KYC, conferência de dados de um cliente/fornecedor).",
    "",
    "QUANDO NÃO USAR: para localizar pessoas, enriquecer listas, vigilância ou qualquer uso sem base legal (LGPD); ",
    "para CNPJ (use consultar_cnpj); para validar apenas o formato (rejeite formato inválido sem chamar a tool). ",
    "Cada consulta consome crédito da conta do usuário.",
  ].join(" "),
  inputSchema: consultarCpfSchema,
};

export async function consultarCpfHandler(
  input: ConsultarCpfInput,
): Promise<CallToolResult> {
  const cpfLimpo = limparCpf(input.cpf);

  if (!validarCpf(cpfLimpo)) {
    return {
      content: [
        {
          type: "text",
          text: `CPF inválido: '${input.cpf}'. Deve conter 11 dígitos (com ou sem máscara), dígitos verificadores válidos e não pode ser uma sequência repetida.`,
        },
      ],
      isError: true,
    };
  }

  const pacote = input.completo ? 3 : 1;

  try {
    const dados = await cpfcnpj.consultar<unknown>(pacote, cpfLimpo);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(dados, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroCpfCnpj(err, {
            notFound: `CPF ${cpfLimpo} válido, porém não localizado nas bases da Receita Federal.`,
            contextoErro: "Erro ao consultar CPF",
          }),
        },
      ],
      isError: true,
    };
  }
}
