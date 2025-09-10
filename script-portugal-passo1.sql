-- SCRIPT CORRIGIDO: Execução Passo a Passo
-- Execute cada bloco separadamente no Supabase SQL Editor

-- =====================================
-- PASSO 1: Adicionar novos campos
-- =====================================

-- 1.1. Adicionar campos específicos para Portugal na tabela service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS freguesia TEXT,
ADD COLUMN IF NOT EXISTS concelho TEXT;

-- 1.2. Adicionar campos de endereço na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip_code TEXT,
ADD COLUMN IF NOT EXISTS address_freguesia TEXT,
ADD COLUMN IF NOT EXISTS address_concelho TEXT;

-- =====================================
-- PASSO 2: Criar funções auxiliares
-- =====================================

-- 2.1. Função para validar código postal português
CREATE OR REPLACE FUNCTION validate_portuguese_postal_code(postal_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se o formato é XXXX-XXX (4 dígitos, hífen, 3 dígitos)
  RETURN postal_code ~ '^\d{4}-\d{3}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2.2. Função para formatar código postal português
CREATE OR REPLACE FUNCTION format_portuguese_postal_code(postal_code TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove todos os caracteres não numéricos
  postal_code := regexp_replace(postal_code, '[^0-9]', '', 'g');
  
  -- Se tem exatamente 7 dígitos, formata como XXXX-XXX
  IF length(postal_code) = 7 THEN
    RETURN substring(postal_code from 1 for 4) || '-' || substring(postal_code from 5 for 3);
  END IF;
  
  -- Se não tem 7 dígitos, retorna NULL
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
