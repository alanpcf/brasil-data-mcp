/**
 * Tool: consultar_inscricao_estadual (premium cpfcnpj.com.br, só com token)
 *
 * Inscrições estaduais de um CNPJ (todas as UFs), com filtro opcional por UF.
 * Endpoint: /{token}/16/{cnpj}. A API NÃO recebe UF; devolve o array completo
 * e o filtro por UF é feito no cliente.
 *
 * Segue o padrão de src/tools/cnpj.ts (schema Zod, validação local, erros
 * traduzidos em PT, JSON estruturado). Registrada só com o provedor habilitado.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { cpfcnpj } from "../clients/cpfcnpj.js";
import {
  limparCnpj,
  limparCnpjAlfanumerico,
  validarCnpj,
  validarCnpjAlfanumerico,
} from "../utils/cnpj.js";
import { traduzirErroCpfCnpj } from "../utils/errors.js";

export const consultarInscricaoEstadualSchema = z.object({
  cnpj: z
    .string()
    .describe(
      "CNPJ da empresa, com ou sem máscara. Aceita numérico ou alfanumérico (IN RFB 2.229/2024).",
    ),
  uf: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .describe(
      "Opcional. Sigla da UF (2 letras, ex.: 'MG', 'SP') para filtrar apenas a inscrição estadual daquele estado. Omita para receber todas as UFs.",
    ),
});

type ConsultarInscricaoEstadualInput = z.infer<
  typeof consultarInscricaoEstadualSchema
>;

interface InscricaoEstadual {
  inscricao_estadual?: string;
  ativo?: boolean;
  atualizado_em?: string;
  estado?: { sigla?: string; nome?: string };
}

interface RespostaPacote16 {
  cnpj?: string;
  razao?: string;
  inscricoesEstaduais?: InscricaoEstadual[];
}

export const consultarInscricaoEstadualTool = {
  name: "consultar_inscricao_estadual",
  description: [
    "Consulta as inscrições estaduais (IE) de um CNPJ (provedor premium cpfcnpj.com.br, requer CPFCNPJ_TOKEN).",
    "",
    "Retorna em JSON: razão social e a lista de inscrições estaduais conhecidas, cada uma com número, se está ativa, ",
    "data de atualização e a UF. Aceita um filtro opcional por UF (aplicado no cliente).",
    "",
    "QUANDO USAR: emitir NF-e, cadastrar fornecedor ou conferir se a empresa tem IE ativa em determinada UF.",
    "",
    "QUANDO NÃO USAR: para a situação cadastral do CNPJ na Receita (use consultar_cnpj). ",
    "Cada consulta consome crédito da conta do usuário.",
  ].join(" "),
  inputSchema: consultarInscricaoEstadualSchema,
};

export async function consultarInscricaoEstadualHandler(
  input: ConsultarInscricaoEstadualInput,
): Promise<CallToolResult> {
  const cnpjNumerico = limparCnpj(input.cnpj);
  const cnpjAlfa = limparCnpjAlfanumerico(input.cnpj);
  const ehNumerico = validarCnpj(cnpjNumerico);
  const ehAlfanumerico = !ehNumerico && validarCnpjAlfanumerico(cnpjAlfa);

  if (!ehNumerico && !ehAlfanumerico) {
    return {
      content: [
        {
          type: "text",
          text: `CNPJ inválido: '${input.cnpj}'. Deve conter 14 posições (numérico ou alfanumérico) e não pode ser uma sequência repetida.`,
        },
      ],
      isError: true,
    };
  }

  // Caminho pago: valida DV antes da rede (o numérico é subconjunto do
  // alfanumérico). Sem isso um CNPJ com 14 dígitos e DV errado gastaria crédito.
  if (!validarCnpjAlfanumerico(cnpjAlfa)) {
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

  if (input.uf !== undefined && !/^[A-Za-z]{2}$/.test(input.uf)) {
    return {
      content: [
        {
          type: "text",
          text: `UF inválida: '${input.uf}'. Use a sigla de 2 letras, ex.: 'MG', 'SP'.`,
        },
      ],
      isError: true,
    };
  }

  const documento = ehNumerico ? cnpjNumerico : cnpjAlfa;
  const uf = input.uf ? input.uf.toUpperCase() : undefined;

  try {
    const dados = await cpfcnpj.consultar<RespostaPacote16>(16, documento);
    const todas = dados.inscricoesEstaduais ?? [];
    const filtradas = uf
      ? todas.filter((ie) => ie.estado?.sigla?.toUpperCase() === uf)
      : todas;

    const saida: Record<string, unknown> = {
      cnpj: dados.cnpj,
      razao: dados.razao,
      inscricoesEstaduais: filtradas,
    };

    // Lista vazia com UF pedida não é erro: a empresa pode simplesmente não
    // ter IE naquele estado.
    if (uf && filtradas.length === 0) {
      saida.mensagem = `Nenhuma inscrição estadual encontrada para o CNPJ ${documento} na UF ${uf}.`;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(saida, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroCpfCnpj(err, {
            notFound: `CNPJ ${documento} válido, porém não localizado nas bases da Receita Federal.`,
            contextoErro: "Erro ao consultar inscrição estadual",
          }),
        },
      ],
      isError: true,
    };
  }
}
