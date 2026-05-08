/**
 * Tradução centralizada de erros do cliente BrasilAPI em mensagens em PT.
 *
 * Atende ao princípio não-negociável "erros traduzidos: nada cru pro modelo".
 * Antes desta extração, cada handler tratava só 404 e o resto vazava
 * `"BrasilAPI retornou 400 em /cnpj/v1/X"` — vazando nome interno da API
 * e path. Aqui mapeamos cada classe de erro pra uma mensagem amigável.
 *
 * Cada handler passa um `MapeamentoErro` com a mensagem específica de 404
 * (que costuma ser contextual: "CNPJ X não encontrado", "Banco Y não...")
 * e um prefixo opcional pra outras classes ("Erro ao consultar CNPJ").
 */

import { BrasilApiError } from "../clients/brasilapi.js";

export interface MapeamentoErro {
  /** Mensagem específica pra 404 (recurso não existe). */
  notFound: string;
  /** Prefixo usado em erros não-404. Default: "Erro ao consultar dados". */
  contextoErro?: string;
}

export function traduzirErroBrasilApi(
  err: unknown,
  mapa: MapeamentoErro,
): string {
  const ctx = mapa.contextoErro ?? "Erro ao consultar dados";

  if (err instanceof BrasilApiError) {
    if (err.status === 404) return mapa.notFound;
    if (err.status === 400) {
      return `${ctx}: dados inválidos enviados ao serviço.`;
    }
    if (err.status === 429) {
      return `${ctx}: limite de requisições temporariamente atingido. Tente novamente em alguns segundos.`;
    }
    if (err.status >= 500) {
      return `${ctx}: serviço temporariamente indisponível. Tente novamente em alguns instantes.`;
    }
    // status === 0 é o sinal que usamos no cliente pra erro de rede / abort.
    if (err.status === 0) {
      return `${ctx}: falha de rede ao alcançar o serviço.`;
    }
    return `${ctx}: o serviço retornou erro inesperado (${err.status}).`;
  }

  const msg = err instanceof Error ? err.message : String(err);
  return `${ctx}: ${msg}`;
}
