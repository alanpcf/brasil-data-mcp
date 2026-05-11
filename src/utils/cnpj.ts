/**
 * Helpers de CNPJ compartilhados entre tools (consultar_cnpj, consultar_corretora).
 *
 * Extraídos de src/tools/cnpj.ts quando uma segunda tool passou a precisar
 * da mesma validação — princípio "extrair quando duplicação real aparecer".
 *
 * Não valida dígitos verificadores: a BrasilAPI já faz isso no servidor e
 * devolve 400 com mensagem clara. Duplicar a regra de DV no cliente só
 * duplicaria manutenção sem ganho real.
 */

/** Remove qualquer caractere não-dígito. */
export function limparCnpj(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Valida formato básico:
 *   - exatamente 14 dígitos
 *   - não pode ser todos iguais (00000000000000, 11111111111111, ...).
 *     Esses passam no test de comprimento mas são CNPJs notórios usados
 *     em teste/sandbox e a Receita rejeita.
 */
export function validarCnpj(s: string): boolean {
  if (!/^\d{14}$/.test(s)) return false;
  if (/^(\d)\1{13}$/.test(s)) return false;
  return true;
}
