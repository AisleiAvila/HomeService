-- ================================================================
-- CRIAÇÃO DA TABELA SERVICE_CLARIFICATIONS
-- Sistema de esclarecimentos (dúvidas e respostas) para solicitações de serviço
-- ================================================================

-- Criar tabela para esclarecimentos
CREATE TABLE IF NOT EXISTS service_clarifications (
    id BIGSERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER, -- Referência para o esclarecimento pai (respostas)
    type VARCHAR(10) NOT NULL CHECK (type IN ('question', 'answer')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES service_clarifications(id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_service_clarifications_service_request_id ON service_clarifications(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_clarifications_user_id ON service_clarifications(user_id);
CREATE INDEX IF NOT EXISTS idx_service_clarifications_parent_id ON service_clarifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_clarifications_created_at ON service_clarifications(created_at);
CREATE INDEX IF NOT EXISTS idx_service_clarifications_is_read ON service_clarifications(is_read);

-- Habilitar RLS (Row Level Security)
ALTER TABLE service_clarifications ENABLE ROW LEVEL SECURITY;

-- Função para verificar se o usuário pode acessar esclarecimentos de uma solicitação
CREATE OR REPLACE FUNCTION can_access_service_request_clarifications(req_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_uuid UUID;
    user_id_int INTEGER;
BEGIN
    -- Obter o UUID do usuário autenticado
    user_uuid := auth.uid();
    
    -- Se não há usuário autenticado, retornar false
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter o ID interno do usuário
    SELECT id INTO user_id_int 
    FROM users 
    WHERE auth_id = user_uuid;
    
    -- Se usuário não encontrado, retornar false
    IF user_id_int IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o usuário é cliente, profissional ou admin da solicitação
    RETURN EXISTS (
        SELECT 1 FROM service_requests sr
        WHERE sr.id = req_id 
        AND (
            sr.client_id = user_id_int OR 
            sr.professional_id = user_id_int OR
            EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = user_id_int 
                AND u.role = 'admin'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para visualizar esclarecimentos
CREATE POLICY "Users can view clarifications of accessible service requests" ON service_clarifications
    FOR SELECT
    USING (can_access_service_request_clarifications(service_request_id));

-- Política para inserir esclarecimentos
CREATE POLICY "Users can insert clarifications for accessible service requests" ON service_clarifications
    FOR INSERT
    WITH CHECK (
        can_access_service_request_clarifications(service_request_id) AND
        auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id)
    );

-- Política para atualizar esclarecimentos (apenas o próprio usuário pode marcar como lido)
CREATE POLICY "Users can update their own clarifications" ON service_clarifications
    FOR UPDATE
    USING (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id))
    WITH CHECK (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id));

-- Política para deletar esclarecimentos (apenas o próprio usuário)
CREATE POLICY "Users can delete their own clarifications" ON service_clarifications
    FOR DELETE
    USING (auth.uid() = (SELECT auth_id::uuid FROM users WHERE id = user_id));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_service_clarifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_clarifications_updated_at
    BEFORE UPDATE ON service_clarifications
    FOR EACH ROW
    EXECUTE FUNCTION update_service_clarifications_updated_at();

-- View para obter esclarecimentos com informações do usuário
CREATE OR REPLACE VIEW service_clarifications_with_user AS
SELECT 
    sc.*,
    u.name as user_name,
    u.role as user_role,
    u.avatar_url as user_avatar_url
FROM service_clarifications sc
JOIN users u ON sc.user_id = u.id
ORDER BY sc.created_at ASC;

-- Comentários para documentação
COMMENT ON TABLE service_clarifications IS 'Sistema de esclarecimentos (dúvidas e respostas) para solicitações de serviço';
COMMENT ON COLUMN service_clarifications.type IS 'Tipo do esclarecimento: question (pergunta) ou answer (resposta)';
COMMENT ON COLUMN service_clarifications.parent_id IS 'ID do esclarecimento pai para respostas (NULL para perguntas originais)';
COMMENT ON COLUMN service_clarifications.title IS 'Título resumido da dúvida ou resposta';
COMMENT ON COLUMN service_clarifications.content IS 'Conteúdo detalhado da dúvida ou resposta';
COMMENT ON COLUMN service_clarifications.is_read IS 'Indica se o esclarecimento foi lido pelo destinatário';

-- Função para marcar esclarecimentos como lidos
CREATE OR REPLACE FUNCTION mark_clarifications_as_read(req_id INTEGER, reader_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Marcar como lidos todos os esclarecimentos que não foram criados pelo usuário atual
    UPDATE service_clarifications 
    SET is_read = TRUE 
    WHERE service_request_id = req_id 
    AND user_id != reader_user_id 
    AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar esclarecimentos não lidos
CREATE OR REPLACE FUNCTION count_unread_clarifications(req_id INTEGER, reader_user_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM service_clarifications 
        WHERE service_request_id = req_id 
        AND user_id != reader_user_id 
        AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;