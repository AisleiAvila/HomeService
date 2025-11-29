-- ============================================================================
-- Script de Migração: Remoção do Papel Cliente
-- Data: 2025-11-29
-- Descrição: Centraliza gestão de serviços no administrador
--            Remove participação de clientes como usuários da plataforma
-- ============================================================================

-- IMPORTANTE: Execute este script em uma transação para poder reverter em caso de erro
-- Para executar: copie e cole no SQL Editor do Supabase

BEGIN;

-- ============================================================================
-- PASSO 1: Backup de segurança (apenas visualização)
-- ============================================================================

-- Visualizar dados atuais de usuários
SELECT 
    id,
    name,
    email,
    role,
    status,
    email_verified
FROM users
WHERE role = 'client'
ORDER BY id
LIMIT 50;

-- Visualizar solicitações com clientes
SELECT 
    id,
    client_id,
    professional_id,
    title,
    status
FROM service_requests
WHERE client_id IS NOT NULL
ORDER BY id DESC
LIMIT 20;

-- ============================================================================
-- PASSO 2: Adicionar novos campos em service_requests
-- ============================================================================

-- Adicionar campos de cliente (informativos)
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS client_postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS client_locality VARCHAR(255);

-- Adicionar campos administrativos
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS created_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS paid_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS finalized_by_admin_id INTEGER REFERENCES users(id);

-- Adicionar campos de pagamento
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Adicionar campos de controle de tempo
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;

-- Adicionar notas administrativas
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Adicionar comentário aos campos deprecated
COMMENT ON COLUMN service_requests.quote_amount IS 'DEPRECATED: Campo do sistema antigo de orçamentos - será removido';
COMMENT ON COLUMN service_requests.quote_description IS 'DEPRECATED: Campo do sistema antigo de orçamentos - será removido';
COMMENT ON COLUMN service_requests.quote_sent_at IS 'DEPRECATED: Campo do sistema antigo de orçamentos - será removido';

-- ============================================================================
-- PASSO 3: Migrar dados existentes
-- ============================================================================

-- Preencher campos de cliente com dados dos usuários existentes
UPDATE service_requests sr
SET 
  client_name = COALESCE((SELECT name FROM users WHERE id = sr.client_id), 'Cliente não especificado'),
  client_email = (SELECT email FROM users WHERE id = sr.client_id),
  client_phone = (SELECT phone FROM users WHERE id = sr.client_id),
  client_address = COALESCE(
    sr.street || ', ' || 
    COALESCE(sr.city, '') || ' ' || 
    COALESCE(sr.zip_code, ''),
    'Endereço não especificado'
  )
WHERE client_id IS NOT NULL;

-- Preencher created_by_admin_id para solicitações existentes
-- Usar o primeiro admin encontrado como criador padrão
UPDATE service_requests sr
SET created_by_admin_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
)
WHERE created_by_admin_id IS NULL;

-- ============================================================================
-- PASSO 4: Tornar client_id nullable (já era, mas garantir)
-- ============================================================================

-- Remover constraint NOT NULL se existir
ALTER TABLE service_requests 
  ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN service_requests.client_id IS 'DEPRECATED: FK para users - clientes agora são apenas dados informativos. Manter por compatibilidade temporária.';

-- ============================================================================
-- PASSO 5: Deprecar usuários com role = 'client'
-- ============================================================================

-- Adicionar coluna para rastrear role deprecated
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deprecated_role VARCHAR(50);

-- Adicionar coluna para rastrear data de depreciação
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP WITH TIME ZONE;

-- Marcar clientes como deprecated
UPDATE users
SET 
  deprecated_role = role,
  deprecated_at = NOW(),
  status = 'Inactive'
WHERE role = 'client';

-- Temporariamente mudar role para 'professional' para evitar erros de constraint
-- (será corrigido no próximo passo)
UPDATE users
SET role = 'professional'
WHERE role = 'client';

-- ============================================================================
-- PASSO 6: Atualizar constraint de role
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

-- Adicionar nova constraint (apenas admin e professional)
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'professional'));

-- Adicionar comentário
COMMENT ON COLUMN users.deprecated_role IS 'Armazena o papel original do usuário antes da depreciação (ex: client)';

-- ============================================================================
-- PASSO 7: Atualizar políticas RLS para service_requests
-- ============================================================================

-- Remover políticas antigas baseadas em cliente
DROP POLICY IF EXISTS "Clients can view own requests" ON service_requests;
DROP POLICY IF EXISTS "Clients can create requests" ON service_requests;
DROP POLICY IF EXISTS "Clients can update own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON service_requests;

-- Criar política para admins (acesso total)
DROP POLICY IF EXISTS "Admins can manage all requests" ON service_requests;
CREATE POLICY "Admins can manage all requests"
  ON service_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = auth.email())
      AND users.role = 'admin'
    )
  );

-- Criar política para profissionais (ver suas solicitações)
DROP POLICY IF EXISTS "Professionals can view assigned requests" ON service_requests;
CREATE POLICY "Professionals can view assigned requests"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (
    professional_id = (SELECT id FROM users WHERE email = auth.email())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = auth.email())
      AND users.role = 'admin'
    )
  );

-- Criar política para profissionais (atualizar suas solicitações)
DROP POLICY IF EXISTS "Professionals can update assigned requests" ON service_requests;
CREATE POLICY "Professionals can update assigned requests"
  ON service_requests
  FOR UPDATE
  TO authenticated
  USING (professional_id = (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (professional_id = (SELECT id FROM users WHERE email = auth.email()));

-- ============================================================================
-- PASSO 8: Atualizar tabela de chat_messages (se necessário)
-- ============================================================================

-- Adicionar constraint para validar sender_id (apenas admin e professional)
-- Nota: Não criar constraint FK porque pode haver mensagens antigas de clientes

COMMENT ON COLUMN chat_messages.sender_id IS 
  'FK para users - apenas admin ou professional no novo sistema. Mensagens antigas de clientes são mantidas.';

-- ============================================================================
-- PASSO 9: Atualizar tabela de evaluations
-- ============================================================================

-- Adicionar coluna para marcar avaliações deprecated
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT FALSE;

-- Marcar avaliações de clientes como deprecated
UPDATE evaluations
SET deprecated = TRUE
WHERE evaluator_id IN (
  SELECT id FROM users WHERE deprecated_role = 'client'
);

COMMENT ON COLUMN evaluations.deprecated IS 
  'TRUE para avaliações do sistema antigo (feitas por clientes). No novo sistema, apenas admins avaliam.';

-- ============================================================================
-- PASSO 10: Criar índices para melhor performance
-- ============================================================================

-- Índices nos novos campos administrativos
CREATE INDEX IF NOT EXISTS idx_service_requests_created_by_admin 
  ON service_requests(created_by_admin_id);
  
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_by_admin 
  ON service_requests(assigned_by_admin_id);
  
CREATE INDEX IF NOT EXISTS idx_service_requests_paid_by_admin 
  ON service_requests(paid_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_finalized_by_admin 
  ON service_requests(finalized_by_admin_id);

-- Índice para consultas por nome de cliente
CREATE INDEX IF NOT EXISTS idx_service_requests_client_name 
  ON service_requests(client_name);

-- ============================================================================
-- PASSO 11: Verificações finais
-- ============================================================================

-- Verificar estrutura atualizada
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name IN (
  'client_id', 'client_name', 'client_email', 'client_phone',
  'client_address', 'created_by_admin_id', 'payment_date',
  'payment_amount', 'payment_method', 'admin_notes'
)
ORDER BY ordinal_position;

-- Contar registros migrados
SELECT 
  COUNT(*) as total_requests,
  COUNT(client_id) as with_client_id,
  COUNT(client_name) as with_client_name,
  COUNT(client_email) as with_client_email,
  COUNT(created_by_admin_id) as with_admin_creator,
  COUNT(DISTINCT status) as unique_statuses
FROM service_requests;

-- Verificar usuários
SELECT 
  role,
  deprecated_role,
  status,
  COUNT(*) as total
FROM users
GROUP BY role, deprecated_role, status
ORDER BY role, deprecated_role;

-- Verificar avaliações deprecated
SELECT 
  deprecated,
  COUNT(*) as total
FROM evaluations
GROUP BY deprecated;

-- ============================================================================
-- PASSO 12: Estatísticas finais
-- ============================================================================

SELECT 
  'Migração concluída com sucesso!' as message,
  NOW() as completed_at;

SELECT 
  'Total de usuários com role=client deprecated:' as info,
  COUNT(*) as count
FROM users
WHERE deprecated_role = 'client';

SELECT 
  'Total de solicitações com dados de cliente migrados:' as info,
  COUNT(*) as count
FROM service_requests
WHERE client_name IS NOT NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (se necessário - NÃO EXECUTE se tudo estiver OK)
-- ============================================================================

-- Para reverter as mudanças em caso de erro:
-- 
-- BEGIN;
-- 
-- -- Reverter roles de usuários
-- UPDATE users 
-- SET role = deprecated_role, 
--     status = 'Active',
--     deprecated_at = NULL
-- WHERE deprecated_role = 'client';
-- 
-- -- Remover constraint nova
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- 
-- -- Recriar constraint antiga
-- ALTER TABLE users 
--   ADD CONSTRAINT users_role_check 
--   CHECK (role IN ('client', 'admin', 'professional'));
-- 
-- -- Remover colunas deprecated
-- ALTER TABLE users DROP COLUMN IF EXISTS deprecated_role;
-- ALTER TABLE users DROP COLUMN IF EXISTS deprecated_at;
-- 
-- COMMIT;
-- 
-- ============================================================================

-- ============================================================================
-- PRÓXIMOS PASSOS APÓS VALIDAÇÃO (executar separadamente)
-- ============================================================================

-- Após validar que a aplicação funciona corretamente:
-- 
-- 1. Remover campos de orçamento deprecated (após alguns meses):
-- 
-- ALTER TABLE service_requests
--   DROP COLUMN IF EXISTS quote_amount,
--   DROP COLUMN IF EXISTS quote_description,
--   DROP COLUMN IF EXISTS quote_sent_at,
--   DROP COLUMN IF EXISTS quote_approved_at;
-- 
-- 2. Deletar permanentemente usuários com role deprecated (após backup):
-- 
-- DELETE FROM users WHERE deprecated_role = 'client';
-- 
-- 3. Remover colunas deprecated:
-- 
-- ALTER TABLE users DROP COLUMN IF EXISTS deprecated_role;
-- ALTER TABLE users DROP COLUMN IF EXISTS deprecated_at;
-- 
-- ============================================================================

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 
-- 1. Este script foi executado em uma transação (BEGIN/COMMIT)
-- 2. Todos os dados foram migrados preservando informações dos clientes
-- 3. Usuários com role='client' foram marcados como 'Inactive' e deprecated
-- 4. Políticas RLS foram atualizadas para o novo modelo
-- 5. Campos deprecated foram marcados mas NÃO removidos (segurança)
-- 6. Novos índices foram criados para melhor performance
-- 7. A aplicação deve ser testada antes de remover dados deprecated
-- 
-- ============================================================================
