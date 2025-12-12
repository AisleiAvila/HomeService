export interface Distrito {
  id: number;
  codigo: string;
  nome: string;
  created_at?: string;
  updated_at?: string;
}

export interface Concelho {
  id: number;
  codigo: string;
  nome: string;
  codigo_distrito: string;
  distrito_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface CodigoPostal {
  id: number;
  codigo_postal_completo: string;
  cod_distrito: string;
  cod_concelho: string;
  cod_localidade: string;
  nome_localidade: string;
  cod_arteria?: string;
  tipo_arteria?: string;
  prep1?: string;
  titulo_arteria?: string;
  prep2?: string;
  nome_arteria?: string;
  local_arteria?: string;
  troco?: string;
  porta?: string;
  cliente?: string;
  num_cod_postal: string;
  ext_cod_postal: string;
  desig_postal: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface EnderecoCompleto {
  codigo_postal: string;
  localidade: string;
  concelho: string;
  distrito: string;
  arteria?: string;
  designacao_postal: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ValidationResultDatabase {
  valid: boolean;
  endereco?: EnderecoCompleto;
  error?: string;
}
