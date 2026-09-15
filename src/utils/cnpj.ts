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

/**
 * Normaliza CNPJ alfanumérico (IN RFB 2.229/2024, vigência jul/2026).
 *
 * Diferente de limparCnpj (que usa \D e MUTILA as letras do formato novo),
 * aqui removemos só pontuação e mantemos letras, comparando em MAIÚSCULAS
 * como a norma exige. A BrasilAPI já aceita o formato; usamos estes helpers
 * no caminho grátis (alfa) e no provedor premium.
 */
export function limparCnpjAlfanumerico(s: string): string {
  return s.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/**
 * Valida CNPJ alfanumérico (IN RFB 2.229/2024):
 *   - 12 posições alfanuméricas (0-9, A-Z) + 2 dígitos verificadores numéricos;
 *   - não pode ser uma sequência repetida;
 *   - dígitos verificadores por módulo 11 sobre (charCode - 48).
 *
 * A norma mantém o numérico como subconjunto: um CNPJ só de dígitos válido
 * (ex.: 11222333000181) também passa aqui. O DV é validado localmente para
 * poupar crédito antes de bater no provedor (mesma justificativa do CPF).
 */
export function validarCnpjAlfanumerico(s: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(s)) return false;
  if (/^(.)\1{13}$/.test(s)) return false;

  const valor = (i: number): number => s.charCodeAt(i) - 48;

  const dv = (ate: number, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += valor(i) * (pesos[i] ?? 0);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = dv(12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv1 !== Number(s.charAt(12))) return false;

  const dv2 = dv(13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv2 !== Number(s.charAt(13))) return false;
  return true;
}
