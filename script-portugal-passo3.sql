-- =====================================
-- PASSO 4: Adicionar constraints e índices
-- =====================================

-- 4.1. Remover constraints antigas se existirem
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS check_valid_postal_code;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_valid_user_postal_code;

-- 4.2. Adicionar constraint para service_requests
ALTER TABLE service_requests 
ADD CONSTRAINT check_valid_postal_code 
CHECK (zip_code IS NULL OR validate_portuguese_postal_code(zip_code));

-- 4.3. Adicionar constraint para users
ALTER TABLE users 
ADD CONSTRAINT check_valid_user_postal_code 
CHECK (address_zip_code IS NULL OR validate_portuguese_postal_code(address_zip_code));

-- 4.4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_requests_city ON service_requests(city);
CREATE INDEX IF NOT EXISTS idx_service_requests_state ON service_requests(state);
CREATE INDEX IF NOT EXISTS idx_service_requests_zip_code ON service_requests(zip_code);
CREATE INDEX IF NOT EXISTS idx_users_address_city ON users(address_city);
CREATE INDEX IF NOT EXISTS idx_users_address_state ON users(address_state);

-- 4.5. Adicionar comentários para documentar os campos
COMMENT ON COLUMN service_requests.street IS 'Morada completa (Rua/Avenida, número, andar)';
COMMENT ON COLUMN service_requests.city IS 'Localidade (ex: Lisboa, Porto, Coimbra)';
COMMENT ON COLUMN service_requests.state IS 'Distrito português';
COMMENT ON COLUMN service_requests.zip_code IS 'Código postal português (formato: XXXX-XXX)';
COMMENT ON COLUMN service_requests.freguesia IS 'Freguesia (opcional)';
COMMENT ON COLUMN service_requests.concelho IS 'Concelho (opcional)';

COMMENT ON COLUMN users.address_street IS 'Endereço padrão do utilizador - Morada completa';
COMMENT ON COLUMN users.address_city IS 'Endereço padrão do utilizador - Localidade';
COMMENT ON COLUMN users.address_state IS 'Endereço padrão do utilizador - Distrito';
COMMENT ON COLUMN users.address_zip_code IS 'Endereço padrão do utilizador - Código postal';
COMMENT ON COLUMN users.address_freguesia IS 'Endereço padrão do utilizador - Freguesia';
COMMENT ON COLUMN users.address_concelho IS 'Endereço padrão do utilizador - Concelho';

-- 4.6. Verificar se constraints foram aplicadas com sucesso
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid IN ('service_requests'::regclass, 'users'::regclass)
AND conname LIKE '%postal%';

-- Mensagem de sucesso
SELECT 'Constraints e índices aplicados com sucesso!' as resultado;
