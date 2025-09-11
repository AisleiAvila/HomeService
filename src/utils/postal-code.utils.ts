/**
 * Utilitários para manipulação de códigos postais portugueses
 */
export class PostalCodeUtils {
  /**
   * Normaliza o código postal para o formato XXXX-XXX
   * @param postalCode Código postal em qualquer formato
   * @returns Código postal normalizado ou null se inválido
   */
  static normalize(postalCode: string): string | null {
    if (!postalCode) return null;

    // Remove espaços e caracteres especiais, mantém apenas números e hífens
    const cleaned = postalCode.replace(/[^0-9-]/g, "");

    // Se já está no formato correto
    if (/^\d{4}-\d{3}$/.test(cleaned)) {
      return cleaned;
    }

    // Se está sem hífen e tem 7 dígitos
    if (/^\d{7}$/.test(cleaned)) {
      return cleaned.substring(0, 4) + "-" + cleaned.substring(4);
    }

    return null;
  }

  /**
   * Formata código postal para o padrão português
   * Versão mais flexível que permite formatação parcial
   * @param input Entrada do usuário
   * @returns Código postal formatado
   */
  static format(input: string): string {
    // Remove todos os caracteres não numéricos
    const numbers = input.replace(/\D/g, "");

    // Se tem 7 dígitos, formata como XXXX-XXX
    if (numbers.length === 7) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 7)}`;
    }

    // Se tem mais de 4 dígitos, adiciona hífen após 4 dígitos
    if (numbers.length > 4) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    }

    return numbers;
  }

  /**
   * Valida o formato básico de código postal português
   * @param postalCode Código postal a validar
   * @returns true se o formato está correto
   */
  static isValidFormat(postalCode: string): boolean {
    const portuguesePostalCodeRegex = /^\d{4}-\d{3}$/;
    return portuguesePostalCodeRegex.test(postalCode);
  }

  /**
   * Extrai os primeiros 4 dígitos do código postal
   * @param postalCode Código postal
   * @returns Primeiros 4 dígitos ou null se inválido
   */
  static getCp4(postalCode: string): string | null {
    const normalized = this.normalize(postalCode);
    return normalized ? normalized.substring(0, 4) : null;
  }

  /**
   * Extrai os últimos 3 dígitos do código postal
   * @param postalCode Código postal
   * @returns Últimos 3 dígitos ou null se inválido
   */
  static getCp3(postalCode: string): string | null {
    const normalized = this.normalize(postalCode);
    return normalized ? normalized.substring(5, 8) : null;
  }
}
