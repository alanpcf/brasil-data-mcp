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
import {
  CpfCnpjError,
  cpfcnpj,
  cpfcnpjHabilitado,
  pacoteCnpjConfigurado,
} from "../clients/cpfcnpj.js";
import {
  limparCnpj,
  limparCnpjAlfanumerico,
  validarCnpj,
  validarCnpjAlfanumerico,
} from "../utils/cnpj.js";
import {
  traduzirErroBrasilApi,
  traduzirErroCpfCnpj,
} from "../utils/errors.js";

export const consultarCnpjSchema = z.object({
  cnpj: z
    .string()
    .describe(
      "CNPJ da empresa, com ou sem máscara. Aceita numérico ('12.345.678/0001-90' ou '12345678000190') e alfanumérico da IN RFB 2.229/2024 (ex.: '12ABC34501DE35').",
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
    "Fonte: BrasilAPI por padrão (sem chave), inclusive CNPJ alfanumérico (IN RFB 2.229/2024). ",
    "Se a variável de ambiente CPFCNPJ_TOKEN estiver definida, usa o provedor premium cpfcnpj.com.br ",
    "(dados oficiais em tempo real, pacote configurável) e cai para a BrasilAPI se o provedor falhar; ",
    "aí o campo 'fonte' na resposta indica a origem. Sem o token a resposta é o JSON cru da BrasilAPI, ",
    "igual às versões anteriores.",
    "",
    "NÃO use para: CPF (pessoa física), empresas estrangeiras, ou validação local de formato ",
    "(rejeite formato inválido sem chamar a tool). Aceita CNPJ com ou sem máscara.",
  ].join(" "),
  inputSchema: consultarCnpjSchema,
};

/** Empacota o JSON de sucesso marcando a procedência pro LLM. */
function respostaComFonte(
  dados: unknown,
  fonte: string,
  avisoProvedor?: string,
): CallToolResult {
  const base =
    typeof dados === "object" && dados !== null
      ? { ...(dados as Record<string, unknown>) }
      : { dados };
  // `fonte` por ÚLTIMO: a procedência é nossa e não pode ser sobrescrita por
  // um campo `fonte` que venha no payload da API.
  const corpo: Record<string, unknown> = { ...base, fonte };
  if (avisoProvedor) {
    corpo.aviso_provedor = avisoProvedor;
  }
  return {
    content: [
      {
        type: "text",
        // JSON estruturado, não texto livre: o modelo extrai campos com
        // mais confiabilidade quando recebe JSON.
        text: JSON.stringify(corpo, null, 2),
      },
    ],
  };
}

/** Consulta a BrasilAPI (caminho padrão, sem chave). */
async function consultarViaBrasilApi(
  cnpj: string,
  extras?: { marcarFonte?: boolean; avisoProvedor?: string },
): Promise<CallToolResult> {
  try {
    const dados = await brasilApi.get<unknown>(`/cnpj/v1/${cnpj}`);
    // Sem token: JSON cru, contrato idêntico ao 0.3.0. `fonte` só entra no
    // caminho premium (sucesso pago ou fallback depois de falha do provedor).
    if (extras?.marcarFonte || extras?.avisoProvedor) {
      return respostaComFonte(dados, "BrasilAPI", extras.avisoProvedor);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `CNPJ ${cnpj} não encontrado na base da Receita Federal. Verifique se está correto.`,
            contextoErro: "Erro ao consultar CNPJ",
          }),
        },
      ],
      isError: true,
    };
  }
}

export async function consultarCnpjHandler(
  input: ConsultarCnpjInput,
): Promise<CallToolResult> {
  const cnpjNumerico = limparCnpj(input.cnpj);
  const cnpjAlfa = limparCnpjAlfanumerico(input.cnpj);
  const ehNumerico = validarCnpj(cnpjNumerico);
  const ehAlfanumerico = !ehNumerico && validarCnpjAlfanumerico(cnpjAlfa);

  // Sem o provedor premium: BrasilAPI, JSON cru. Numérico e alfanumérico
  // (a BrasilAPI já documenta o padrão da IN RFB 2.229/2024).
  if (!cpfcnpjHabilitado()) {
    if (ehNumerico) {
      return consultarViaBrasilApi(cnpjNumerico);
    }
    if (ehAlfanumerico) {
      return consultarViaBrasilApi(cnpjAlfa);
    }
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

  // Provedor habilitado. Diferente da BrasilAPI (que valida o DV no servidor),
  // cada chamada aqui gasta crédito, então validamos o DV LOCALMENTE antes de
  // qualquer fetch: validarCnpjAlfanumerico calcula o DV e trata o numérico
  // como subconjunto. Um DV errado devolve erro amigável, sem rede e sem
  // cobrança no provedor.
  const documento = cnpjAlfa;
  const formatoOk =
    /^[0-9A-Z]{12}\d{2}$/.test(documento) && !/^(.)\1{13}$/.test(documento);

  if (!formatoOk) {
    return {
      content: [
        {
          type: "text",
          text: `CNPJ inválido: '${input.cnpj}'. Deve conter 14 posições (numérico ou alfanumérico da IN RFB 2.229/2024) e não pode ser uma sequência repetida.`,
        },
      ],
      isError: true,
    };
  }

  if (!validarCnpjAlfanumerico(documento)) {
    return {
      content: [
        {
          type: "text",
          text: `CNPJ inválido: '${input.cnpj}'. Dígito verificador inválido.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await cpfcnpj.consultar<unknown>(
      pacoteCnpjConfigurado(),
      documento,
    );
    return respostaComFonte(dados, "cpfcnpj.com.br");
  } catch (err) {
    console.error(
      "[brasil-data-mcp] provedor cpfcnpj.com.br falhou em consultar_cnpj; caindo para a BrasilAPI.",
    );
    // Erro PERMANENTE de conta (1000 a 1004: token/IP, créditos, conta ou IP
    // bloqueados, pacote indisponível): o operador precisa saber, senão acha
    // que o provedor está ativo. Vai no JSON como aviso_provedor. Erros
    // transitórios (rede, 5xx, 1005 a 1007) ficam só no stderr.
    const codigo = err instanceof CpfCnpjError ? err.codigo : 0;
    const avisoProvedor =
      codigo >= 1000 && codigo <= 1004
        ? traduzirErroCpfCnpj(err, {
            notFound: "recurso não localizado no provedor.",
            contextoErro: "Provedor cpfcnpj.com.br indisponível",
          })
        : undefined;
    return consultarViaBrasilApi(documento, {
      marcarFonte: true,
      avisoProvedor,
    });
  }
}
