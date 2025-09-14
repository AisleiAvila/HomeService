-- ================================================================
-- CONFIGURAÇÃO DA TABELA ENHANCED_NOTIFICATIONS
-- Configurar RLS e estrutura adequada para notificações melhoradas
-- ================================================================

-- Verificar se a tabela existe e criar se necessário
CREATE TABLE IF NOT EXISTS enhanced_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    service_request_id INTEGER,
    action_required BOOLEAN DEFAULT FALSE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_user_id ON enhanced_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_created_at ON enhanced_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_read ON enhanced_notifications(read);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_service_request ON enhanced_notifications(service_request_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE enhanced_notifications ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias notificações
CREATE POLICY "Users can view their own notifications" ON enhanced_notifications
    FOR SELECT
    USING (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id));

-- Política para inserir notificações (apenas sistema/admin)
CREATE POLICY "System can insert notifications" ON enhanced_notifications
    FOR INSERT
    WITH CHECK (true); -- Permitir inserção pelo sistema

-- Política para atualizar notificações (apenas o próprio usuário)
CREATE POLICY "Users can update their own notifications" ON enhanced_notifications
    FOR UPDATE
    USING (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id));

-- Política para deletar notificações (apenas o próprio usuário)
CREATE POLICY "Users can delete their own notifications" ON enhanced_notifications
    FOR DELETE
    USING (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id));

-- Adicionar comentários para documentação
COMMENT ON TABLE enhanced_notifications IS 'Notificações melhoradas com suporte a tipos, prioridades e ações';
COMMENT ON COLUMN enhanced_notifications.type IS 'Tipo da notificação (quote_request, work_started, etc.)';
COMMENT ON COLUMN enhanced_notifications.priority IS 'Prioridade da notificação: low, medium, high';
COMMENT ON COLUMN enhanced_notifications.action_required IS 'Se a notificação requer ação do usuário';
COMMENT ON COLUMN enhanced_notifications.expires_at IS 'Data de expiração da notificação (opcional)';