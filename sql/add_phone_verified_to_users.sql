-- Adiciona o campo phone_verified à tabela users
ALTER TABLE users
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;

-- Opcional: atualiza todos os usuários existentes para não validados
UPDATE users SET phone_verified = FALSE WHERE phone_verified IS NULL;