-- Criação da tabela para armazenar notificações in-app
-- Permite que usuários recebam notificações dentro da aplicação

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON in_app_notifications(type);

-- Comentários para documentação
COMMENT ON TABLE in_app_notifications IS 'Armazena notificações in-app para usuários';
COMMENT ON COLUMN in_app_notifications.user_id IS 'ID do usuário que receberá a notificação';
COMMENT ON COLUMN in_app_notifications.type IS 'Tipo da notificação (service_assigned, status_change, message, etc.)';
COMMENT ON COLUMN in_app_notifications.title IS 'Título da notificação';
COMMENT ON COLUMN in_app_notifications.message IS 'Mensagem completa da notificação';
COMMENT ON COLUMN in_app_notifications.link IS 'Link opcional para ação relacionada (ex: /request/123)';
COMMENT ON COLUMN in_app_notifications.read IS 'Indica se a notificação foi lida';
COMMENT ON COLUMN in_app_notifications.created_at IS 'Data e hora de criação da notificação';
COMMENT ON COLUMN in_app_notifications.read_at IS 'Data e hora em que a notificação foi marcada como lida';
COMMENT ON COLUMN in_app_notifications.metadata IS 'Dados adicionais em formato JSON (request_id, etc.)';

-- Nota: Segurança gerenciada na camada da aplicação Angular
-- A aplicação controla acesso através do AuthService
