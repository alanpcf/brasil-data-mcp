/**
 * Tool: consultar_corretora
 *
 * Consulta dados cadastrais de corretora de valores autorizada pela CVM
 * (Comissão de Valores Mobiliários) via BrasilAPI.
 * Endpoint: /cvm/corretoras/v1/{cnpj}
 *
 * Por que não tem listar_corretoras: a lista completa tem ~600 corretoras
 * (~150 KB), poluiria o contexto do LLM sem benefício claro. Se aparecer
 * caso de uso (filtro por UF, status), reabrir a decisão.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { limparCnpj, validarCnpj } from "../utils/cnpj.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarCorretoraSchema = z.object({
  cnpj: z
    .string()
    .describe(
      "CNPJ da corretora, com ou sem máscara. 14 dígitos. Ex: '02.332.886/0011-78' (XP Investimentos).",
    ),
});

type ConsultarCorretoraInput = z.infer<typeof consultarCorretoraSchema>;

export const consultarCorretoraTool = {
  name: "consultar_corretora",
  description: [
    "Consulta dados cadastrais de uma corretora de valores autorizada pela CVM (Comissão de Valores Mobiliários) via BrasilAPI.",
    "",
    "Retorna em JSON: CNPJ, nome social, nome comercial, status (em funcionamento, cancelada, etc), endereço completo, e-mail, telefone, data de início e patrimônio quando disponível.",
    "",
    "Use quando o usuário fornecer um CNPJ e quiser saber se é uma corretora autorizada pela CVM, ou puxar os dados cadastrais.",
    "",
    "NÃO use para: empresas em geral (use consultar_cnpj), corretoras de seguros (CVM só regula valores mobiliários), ou buscar por nome (a API só aceita CNPJ).",
  ].join(" "),
  inputSchema: consultarCorretoraSchema,
};

export async function consultarCorretoraHandler(
  input: ConsultarCorretoraInput,
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
    const dados = await brasilApi.get<unknown>(
      `/cvm/corretoras/v1/${cnpjLimpo}`,
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
            notFound: `Corretora com CNPJ ${cnpjLimpo} não encontrada no cadastro da CVM. Verifique se está correto — só corretoras de valores mobiliários autorizadas pela CVM aparecem aqui.`,
            contextoErro: "Erro ao consultar corretora",
          }),
        },
      ],
      isError: true,
    };
  }
}
