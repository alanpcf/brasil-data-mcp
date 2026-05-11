/**
 * Tool: consultar_isbn
 *
 * Consulta metadados de um livro pelo ISBN via BrasilAPI.
 * Endpoint: /isbn/v1/{codigo}
 *
 * A BrasilAPI agrega múltiplos provedores (cbl, mercado-editorial,
 * open-library, google-books) e devolve a primeira resposta com sucesso.
 *
 * ISBN pode ter 10 ou 13 dígitos. O último caractere do ISBN-10 pode ser 'X'
 * (representando o dígito verificador 10), então NÃO removemos letras — só
 * hífens/espaços. O servidor valida DV.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

export const consultarIsbnSchema = z.object({
  codigo: z
    .string()
    .describe(
      "ISBN do livro, 10 ou 13 dígitos. Aceita com ou sem hífens. Ex: '978-85-325-3080-2' ou '9788532530802'.",
    ),
});

type ConsultarIsbnInput = z.infer<typeof consultarIsbnSchema>;

export const consultarIsbnTool = {
  name: "consultar_isbn",
  description: [
    "Consulta metadados de um livro pelo ISBN via BrasilAPI (agrega CBL, Mercado Editorial, Open Library e Google Books).",
    "",
    "Retorna em JSON: título, subtítulo, autores, editora, ano, idioma, número de páginas, assunto/categoria, sinopse (quando disponível) e fonte do dado.",
    "",
    "Use quando o usuário fornecer um ISBN e quiser saber sobre o livro (título, autor, editora, ano).",
    "",
    "NÃO use para: buscar livro por título ou autor (a operação é só ISBN → metadados), validar formato sem consultar (rejeite local se não bater 10/13 dígitos), ou consultar preço/disponibilidade. Aceita ISBN-10 e ISBN-13, com ou sem hífens.",
  ].join(" "),
  inputSchema: consultarIsbnSchema,
};

/**
 * Limpa hífens e espaços. NÃO remove letras: ISBN-10 pode terminar em 'X'
 * (dígito verificador valor 10). Upper-case pra normalizar.
 */
export function limparIsbn(s: string): string {
  return s.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Valida formato local:
 *   - ISBN-10: 9 dígitos seguidos de dígito ou 'X'.
 *   - ISBN-13: 13 dígitos.
 *
 * Não valida dígito verificador (delega API).
 */
export function validarIsbn(s: string): boolean {
  if (/^\d{9}[\dX]$/.test(s)) return true;
  if (/^\d{13}$/.test(s)) return true;
  return false;
}

export async function consultarIsbnHandler(
  input: ConsultarIsbnInput,
): Promise<CallToolResult> {
  const isbnLimpo = limparIsbn(input.codigo);

  if (!validarIsbn(isbnLimpo)) {
    return {
      content: [
        {
          type: "text",
          text: `ISBN inválido: '${input.codigo}'. Deve ter 10 dígitos (último pode ser 'X') ou 13 dígitos. Aceita com ou sem hífens.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const dados = await brasilApi.get<unknown>(`/isbn/v1/${isbnLimpo}`);
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `ISBN ${isbnLimpo} não encontrado nos provedores agregados (CBL, Mercado Editorial, Open Library, Google Books).`,
            contextoErro: "Erro ao consultar ISBN",
          }),
        },
      ],
      isError: true,
    };
  }
}
