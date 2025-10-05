-- Adiciona campos para verificação de SMS na tabela users
ALTER TABLE users
ADD COLUMN sms_code VARCHAR(10),
ADD COLUMN sms_code_expires_at TIMESTAMP;

-- Opcional: permite sobrescrever se já existir
-- ALTER TABLE users DROP COLUMN IF EXISTS sms_code;
-- ALTER TABLE users DROP COLUMN IF EXISTS sms_code_expires_at;