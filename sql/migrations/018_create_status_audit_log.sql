-- Tabela de Auditoria de Status
-- Registra todas as mudanças de status de solicitações de serviço

CREATE TABLE IF NOT EXISTS status_audit_log (
  id BIGSERIAL PRIMARY KEY,
  
  -- Referência à solicitação
  request_id INTEGER NOT NULL,
  
  -- Status anterior e novo
  previous_status TEXT,  -- NULL para primeira mudança
  new_status TEXT NOT NULL,
  
  -- Quem fez a mudança
  changed_by_user_id INTEGER NOT NULL,
  changed_by_role TEXT NOT NULL CHECK (changed_by_role IN ('admin', 'professional', 'client')),
  
  -- Motivo e metadados adicionais
  reason TEXT,
  metadata JSONB,
  
  -- Timestamp da mudança
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índices para melhor performance
  CONSTRAINT fk_request FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_status_audit_request_id ON status_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_status_audit_user_id ON status_audit_log(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_status_audit_timestamp ON status_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_audit_new_status ON status_audit_log(new_status);
CREATE INDEX IF NOT EXISTS idx_status_audit_request_timestamp ON status_audit_log(request_id, timestamp DESC);

-- RLS (Row Level Security)
ALTER TABLE status_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso

-- Admins podem ver tudo
CREATE POLICY "Admins can view all audit logs"
  ON status_audit_log
  FOR SELECT
  TO authenticated
  USING (true);  -- Controle de acesso feito pela aplicação

-- Profissionais podem ver logs das suas solicitações
CREATE POLICY "Professionals can view their request audit logs"
  ON status_audit_log
  FOR SELECT
  TO authenticated
  USING (true);  -- Controle de acesso feito pela aplicação

-- Clientes podem ver logs das suas solicitações
CREATE POLICY "Clients can view their request audit logs"
  ON status_audit_log
  FOR SELECT
  TO authenticated
  USING (true);  -- Controle de acesso feito pela aplicação

-- Permite inserção de logs de auditoria
CREATE POLICY "Allow insert audit logs"
  ON status_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE status_audit_log IS 'Registro de auditoria de todas as mudanças de status de solicitações';
COMMENT ON COLUMN status_audit_log.request_id IS 'ID da solicitação de serviço';
COMMENT ON COLUMN status_audit_log.previous_status IS 'Status anterior (NULL se for a primeira mudança)';
COMMENT ON COLUMN status_audit_log.new_status IS 'Novo status aplicado';
COMMENT ON COLUMN status_audit_log.changed_by_user_id IS 'ID do usuário que fez a mudança';
COMMENT ON COLUMN status_audit_log.changed_by_role IS 'Role do usuário no momento da mudança';
COMMENT ON COLUMN status_audit_log.reason IS 'Motivo da mudança (opcional)';
COMMENT ON COLUMN status_audit_log.metadata IS 'Dados adicionais em JSON (ex: valores de campos alterados)';
COMMENT ON COLUMN status_audit_log.timestamp IS 'Data e hora da mudança';
