-- Script SQL para atualizar a base de dados para suporte a endereços portugueses
-- Execute no painel SQL do Supabase

-- 1. Adicionar campos específicos para Portugal na tabela service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS freguesia TEXT,
ADD COLUMN IF NOT EXISTS concelho TEXT;

-- 2. Adicionar comentários para documentar os campos
COMMENT ON COLUMN service_requests.street IS 'Morada completa (Rua/Avenida, número, andar)';
COMMENT ON COLUMN service_requests.city IS 'Localidade (ex: Lisboa, Porto, Coimbra)';
COMMENT ON COLUMN service_requests.state IS 'Distrito português';
COMMENT ON COLUMN service_requests.zip_code IS 'Código postal português (formato: XXXX-XXX)';
COMMENT ON COLUMN service_requests.freguesia IS 'Freguesia (opcional)';
COMMENT ON COLUMN service_requests.concelho IS 'Concelho (opcional)';

-- 3. Adicionar campo de endereço na tabela users (para endereço padrão do cliente)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip_code TEXT,
ADD COLUMN IF NOT EXISTS address_freguesia TEXT,
ADD COLUMN IF NOT EXISTS address_concelho TEXT;

-- 4. Comentários para a tabela users
COMMENT ON COLUMN users.address_street IS 'Endereço padrão do utilizador - Morada completa';
COMMENT ON COLUMN users.address_city IS 'Endereço padrão do utilizador - Localidade';
COMMENT ON COLUMN users.address_state IS 'Endereço padrão do utilizador - Distrito';
COMMENT ON COLUMN users.address_zip_code IS 'Endereço padrão do utilizador - Código postal';
COMMENT ON COLUMN users.address_freguesia IS 'Endereço padrão do utilizador - Freguesia';
COMMENT ON COLUMN users.address_concelho IS 'Endereço padrão do utilizador - Concelho';

-- 5. Criar função para validar código postal português
CREATE OR REPLACE FUNCTION validate_portuguese_postal_code(postal_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se o formato é XXXX-XXX (4 dígitos, hífen, 3 dígitos)
  RETURN postal_code ~ '^\d{4}-\d{3}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.1. Criar função para formatar código postal português
CREATE OR REPLACE FUNCTION format_portuguese_postal_code(postal_code TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove todos os caracteres não numéricos
  postal_code := regexp_replace(postal_code, '[^0-9]', '', 'g');
  
  -- Se tem exatamente 7 dígitos, formata como XXXX-XXX
  IF length(postal_code) = 7 THEN
    RETURN substring(postal_code from 1 for 4) || '-' || substring(postal_code from 5 for 3);
  END IF;
  
  -- Se não tem 7 dígitos, retorna NULL para indicar formato inválido
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.2. Verificar dados existentes com códigos postais inválidos
DO $$
BEGIN
  RAISE NOTICE 'Verificando códigos postais existentes...';
  
  -- Mostrar códigos postais que precisam ser corrigidos
  IF EXISTS (
    SELECT 1 FROM service_requests 
    WHERE zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(zip_code)
  ) THEN
    RAISE NOTICE 'Encontrados códigos postais inválidos em service_requests. Corrigindo...';
    
    -- Tentar corrigir códigos postais que podem ser formatados
    UPDATE service_requests 
    SET zip_code = format_portuguese_postal_code(zip_code)
    WHERE zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(zip_code)
    AND format_portuguese_postal_code(zip_code) IS NOT NULL;
    
    -- Para códigos que não podem ser corrigidos, definir um código padrão ou NULL
    UPDATE service_requests 
    SET zip_code = NULL -- ou '0000-000' para código padrão
    WHERE zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(zip_code);
    
    RAISE NOTICE 'Códigos postais corrigidos em service_requests.';
  END IF;
  
  -- Verificar tabela users
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE address_zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(address_zip_code)
  ) THEN
    RAISE NOTICE 'Encontrados códigos postais inválidos em users. Corrigindo...';
    
    -- Tentar corrigir códigos postais que podem ser formatados
    UPDATE users 
    SET address_zip_code = format_portuguese_postal_code(address_zip_code)
    WHERE address_zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(address_zip_code)
    AND format_portuguese_postal_code(address_zip_code) IS NOT NULL;
    
    -- Para códigos que não podem ser corrigidos, definir NULL
    UPDATE users 
    SET address_zip_code = NULL
    WHERE address_zip_code IS NOT NULL 
    AND NOT validate_portuguese_postal_code(address_zip_code);
    
    RAISE NOTICE 'Códigos postais corrigidos em users.';
  END IF;
END $$;

-- 6. Adicionar constraint para validar código postal nas requisições
-- Primeiro, dropar a constraint se já existir
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS check_valid_postal_code;
-- Adicionar a constraint
ALTER TABLE service_requests 
ADD CONSTRAINT check_valid_postal_code 
CHECK (zip_code IS NULL OR validate_portuguese_postal_code(zip_code));

-- 7. Adicionar constraint para validar código postal nos utilizadores
-- Primeiro, dropar a constraint se já existir
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_valid_user_postal_code;
-- Adicionar a constraint
ALTER TABLE users 
ADD CONSTRAINT check_valid_user_postal_code 
CHECK (address_zip_code IS NULL OR validate_portuguese_postal_code(address_zip_code));

-- 8. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_requests_city ON service_requests(city);
CREATE INDEX IF NOT EXISTS idx_service_requests_state ON service_requests(state);
CREATE INDEX IF NOT EXISTS idx_service_requests_zip_code ON service_requests(zip_code);
CREATE INDEX IF NOT EXISTS idx_users_address_city ON users(address_city);
CREATE INDEX IF NOT EXISTS idx_users_address_state ON users(address_state);

-- 9. Inserir dados de exemplo com endereços portugueses
INSERT INTO service_requests (
  client_id, client_auth_id, title, description, category,
  street, city, state, zip_code, freguesia, concelho,
  status, payment_status, requested_date
) VALUES
(1, 'client-uuid-1', 'Reparação de canalização', 'Fuga de água na cozinha que precisa de reparo urgente', 'Plumbing',
 'Rua Augusta, 123, 2º Esq', 'Lisboa', 'Lisboa', '1100-048', 'Santa Maria Maior', 'Lisboa',
 'Pending', 'Unpaid', NOW()),

(1, 'client-uuid-1', 'Instalação elétrica', 'Instalar tomadas na sala de estar', 'Electrical',
 'Avenida dos Aliados, 456', 'Porto', 'Porto', '4000-066', 'Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória', 'Porto',
 'Pending', 'Unpaid', NOW()),

(1, 'client-uuid-1', 'Limpeza doméstica', 'Limpeza geral da casa', 'Cleaning',
 'Rua Ferreira Borges, 789', 'Coimbra', 'Coimbra', '3000-180', 'Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)', 'Coimbra',
 'Pending', 'Unpaid', NOW())
ON CONFLICT DO NOTHING;

-- 10. Atualizar utilizadores exemplo com endereços portugueses
UPDATE users 
SET 
  address_street = 'Rua das Flores, 123',
  address_city = 'Lisboa',
  address_state = 'Lisboa',
  address_zip_code = '1200-192',
  address_freguesia = 'Estrela',
  address_concelho = 'Lisboa'
WHERE email = 'cliente@homeservice.com' AND address_street IS NULL;

COMMIT;
