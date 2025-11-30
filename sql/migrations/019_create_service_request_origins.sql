-- Migration: Criação da tabela de origens de solicitação de serviço
CREATE TABLE IF NOT EXISTS service_request_origins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Adiciona o campo origin_id à tabela de solicitações de serviço
ALTER TABLE service_requests
ADD COLUMN origin_id INTEGER REFERENCES service_request_origins(id);