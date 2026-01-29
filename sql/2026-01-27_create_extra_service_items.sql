-- Migration: Criação da tabela extra_service_items para controle detalhado dos serviços extras
CREATE TABLE IF NOT EXISTS extra_service_items (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES service_requests(id),
  professional_id INTEGER NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_reimbursement BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursement_value NUMERIC(10,2),
  reimbursement_date TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_extra_service_items_service_request_id ON extra_service_items(service_request_id);
CREATE INDEX IF NOT EXISTS idx_extra_service_items_professional_id ON extra_service_items(professional_id);
