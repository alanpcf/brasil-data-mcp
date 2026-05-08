/**
 * Tool: consultar_cep
 *
 * Consulta endereço a partir de CEP via BrasilAPI v2 (que agrega
 * múltiplos provedores: ViaCEP, Postmon, etc, com fallback automático).
 * Endpoint: /cep/v2/{cep}
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarCepSchema = z.object({
  cep: z
    .string()
    .describe(
      "CEP brasileiro com ou sem hífen. Aceita '01310-100' ou '01310100'. Deve ter 8 dígitos.",
    ),
});

type ConsultarCepInput = z.infer<typeof consultarCepSchema>;

export const consultarCepTool = {
  name: "consultar_cep",
  description: [
    "Consulta endereço completo a partir de um CEP brasileiro via BrasilAPI v2 (agrega ViaCEP, Postmon e outros provedores com fallback automático).",
    "",
    "Retorna em JSON: estado (UF), cidade, bairro, logradouro e, quando disponível, coordenadas geográficas.",
    "",
    "Use quando o usuário pedir o endereço de um CEP, validar um CEP, ou descobrir cidade/UF a partir de um CEP.",
    "",
    "NÃO use para: códigos postais de outros países, descobrir CEP a partir de endereço (a operação é só CEP → endereço, não inversa). Aceita CEP com ou sem hífen.",
  ].join(" "),
  inputSchema: consultarCepSchema,
};

function limparCep(s: string): string {
  return s.replace(/\D/g, "");
}

function validarCep(s: string): boolean {
  if (!/^\d{8}$/.test(s)) return false;
  // 00000000 e similares passam no length mas não existem.
  if (/^(\d)\1{7}$/.test(s)) return false;
  return true;
}

export async function consultarCepHandler(
  input: ConsultarCepInput,
): Promise<CallToolResult> {
  const cepLimpo = limparCep(input.cep);

  if (!validarCep(cepLimpo)) {
    return {
      content: [
        {
          type: "text",
          text: `CEP inválido: '${input.cep}'. Deve conter 8 dígitos (com ou sem hífen) e não pode ser uma sequência repetida.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/cep/v2/${cepLimpo}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `CEP ${cepLimpo} não encontrado. Verifique se está correto — alguns CEPs muito específicos só existem em provedores pagos.`,
            contextoErro: "Erro ao consultar CEP",
          }),
        },
      ],
      isError: true,
    };
  }
}
