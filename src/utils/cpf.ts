/**
 * Helpers de CPF usados pela tool premium consultar_cpf.
 *
 * Diferente do CNPJ da BrasilAPI (que valida só formato e delega o dígito
 * verificador ao servidor), aqui validamos o DV localmente de propósito: cada
 * consulta ao provedor cpfcnpj.com.br consome crédito da conta do usuário, e
 * rejeitar um CPF com DV errado ANTES da rede protege o bolso dele. Se o
 * mantenedor preferir a política "DV só na API", basta trocar validarCpf por
 * uma checagem de formato.
 */

/** Remove qualquer caractere não-dígito. */
export function limparCpf(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Valida CPF:
 *   - exatamente 11 dígitos;
 *   - não pode ser uma sequência repetida (00000000000, 11111111111, ...);
 *   - dígitos verificadores por módulo 11.
 */
export function validarCpf(s: string): boolean {
  if (!/^\d{11}$/.test(s)) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;

  const digito = (i: number): number => s.charCodeAt(i) - 48;

  const dv = (ate: number, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += digito(i) * (pesoInicial - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  if (dv(9, 10) !== digito(9)) return false;
  if (dv(10, 11) !== digito(10)) return false;
  return true;
}
