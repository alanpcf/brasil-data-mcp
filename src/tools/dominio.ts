/**
 * Tool: consultar_dominio_br
 *
 * Status de registro de domínio .br direto do registro.br via BrasilAPI.
 * Endpoint: /registrobr/v1/{dominio}
 *
 * PEGADINHA da API (verificada): ela aceita 'google.com' e responde
 * silenciosamente sobre 'google.com.br'. Por isso a validação local EXIGE
 * o sufixo .br — sem isso a tool responderia sobre um domínio diferente
 * do que o usuário perguntou.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { brasilApi } from "../clients/brasilapi.js";
import { traduzirErroBrasilApi } from "../utils/errors.js";

/**
 * Normaliza a entrada pra um domínio puro: remove protocolo, www., path,
 * query e espaços; lowercase.
 */
function normalizarDominio(entrada: string): string {
  const semProtocolo = entrada
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");
  const semPath = semProtocolo.split("/")[0] ?? "";
  return semPath.replace(/^www\./, "");
}

/** Formato básico de domínio .br: labels alfanuméricos/hífen, sufixo .br. */
function validarDominioBr(dominio: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.br$/.test(
    dominio,
  );
}

export const consultarDominioBrSchema = z.object({
  dominio: z
    .string()
    .describe(
      "Domínio .br a verificar. Aceita URL completa ou domínio puro — será normalizado (remove http(s)://, www. e caminho). Ex: 'exemplo.com.br' ou 'https://www.exemplo.com.br/pagina'.",
    ),
});

type ConsultarDominioBrInput = z.infer<typeof consultarDominioBrSchema>;

export const consultarDominioBrTool = {
  name: "consultar_dominio_br",
  description: [
    "Consulta o status de registro de um domínio .br direto na base do registro.br (via BrasilAPI).",
    "",
    "Retorna em JSON: status (AVAILABLE = disponível pra registro, REGISTERED = já registrado), fqdn, hosts (servidores DNS) e expires-at quando registrado, e suggestions de extensões quando disponível. O resultado nunca é cacheado — é sempre o status atual.",
    "",
    "Use quando o usuário perguntar 'o domínio X.com.br tá livre?', 'quando expira Y.org.br?', 'quem responde pelo DNS de Z.br?'.",
    "",
    "NÃO use para: domínios internacionais .com/.net/gTLDs (a base é só .br), dados de titular/whois completo (a API não expõe), ou hospedagem/conteúdo do site.",
  ].join(" "),
  inputSchema: consultarDominioBrSchema,
};

export async function consultarDominioBrHandler(
  input: ConsultarDominioBrInput,
): Promise<CallToolResult> {
  const dominio = normalizarDominio(input.dominio);

  if (!validarDominioBr(dominio)) {
    return {
      content: [
        {
          type: "text",
          text: `Domínio inválido: '${input.dominio}'. Esta tool só consulta domínios .br (registro.br). Ex: 'exemplo.com.br'.`,
        },
      ],
      isError: true,
    };
  }

  try {
    // ttlMs: 0 — disponibilidade de domínio é time-sensitive; um resultado
    // cacheado poderia dizer "disponível" pra domínio recém-registrado.
    const dados = await brasilApi.get<unknown>(`/registrobr/v1/${dominio}`, {
      ttlMs: 0,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: traduzirErroBrasilApi(err, {
            notFound: `Domínio ${dominio} não encontrado na base do registro.br.`,
            contextoErro: "Erro ao consultar domínio",
          }),
        },
      ],
      isError: true,
    };
  }
}
