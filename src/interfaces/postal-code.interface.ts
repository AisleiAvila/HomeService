/**
 * Interfaces compartilhadas para validação de códigos postais portugueses
 */

export interface PostalCodeApiResponse {
  result: boolean;
  num_results: number;
  results: Array<{
    cp: string;
    cp4: string;
    cp3: string;
    district: string;
    municipality: string;
    locality: string;
    street_name?: string;
    street_type?: string;
  }>;
}

export interface PostalCodeResult {
  cp: string; // Código postal (ex: "1000-001")
  cp4: string; // Primeiros 4 dígitos (ex: "1000")
  cp3: string; // Últimos 3 dígitos (ex: "001")
  district: string; // Distrito (ex: "Lisboa")
  municipality: string; // Concelho (ex: "Lisboa")
  locality: string; // Localidade (ex: "Lisboa")
  street_name?: string; // Nome da rua (opcional)
  street_type?: string; // Tipo de rua (opcional)
}

export interface ValidationResult {
  isValid: boolean;
  postalCode?: string;
  locality?: string;
  district?: string;
  municipality?: string;
  street?: string;
  error?: string;
}

export interface BatchTestResult extends ValidationResult {
  responseTime: number;
  postalCode: string;
}

export interface PostalCodeInfo {
  locality: string;
  district: string;
  concelho: string;
}
