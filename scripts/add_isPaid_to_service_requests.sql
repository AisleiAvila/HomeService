-- Adiciona o campo isPaid à tabela service_requests
ALTER TABLE service_requests
ADD COLUMN isPaid BOOLEAN NOT NULL DEFAULT FALSE;
