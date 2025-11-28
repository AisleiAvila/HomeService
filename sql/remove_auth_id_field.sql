-- ============================================================================
-- Script para remover o campo auth_id da tabela users
-- Data: 2025-11-28
-- Descrição: Remove o campo auth_id que era usado com Supabase Auth
--            A aplicação agora usa autenticação customizada
-- ============================================================================

-- PASSO 1: Fazer backup dos dados (apenas visualização)
-- Execute isto primeiro para ver os dados atuais
SELECT 
    id,
    name,
    email,
    auth_id,
    role,
    status,
    email_verified
FROM users
ORDER BY id
LIMIT 20;

-- ============================================================================
-- PASSO 2: Verificar índices relacionados ao auth_id
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexdef ILIKE '%auth_id%';

-- ============================================================================
-- PASSO 3: Verificar políticas RLS que usam auth_id
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
AND (qual::text ILIKE '%auth_id%' OR with_check::text ILIKE '%auth_id%');

-- ============================================================================
-- PASSO 4: Verificar constraints relacionados
-- ============================================================================

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND pg_get_constraintdef(oid) ILIKE '%auth_id%';

-- ============================================================================
-- PASSO 5: REMOVER DEPENDÊNCIAS (execute apenas se existirem)
-- ============================================================================

-- Remover constraint único em auth_id (deve ser removido ANTES do índice)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_id_key;

-- Remover índices em auth_id (se ainda existirem)
DROP INDEX IF EXISTS users_auth_id_idx;
DROP INDEX IF EXISTS idx_users_auth_id;

-- Remover políticas RLS que usam auth_id (ajuste os nomes conforme necessário)
-- Exemplo: DROP POLICY IF EXISTS "Users can view own data" ON users;
-- Liste as políticas encontradas no PASSO 3 e remova-as aqui se necessário

-- ============================================================================
-- PASSO 6: REMOVER O CAMPO auth_id
-- ============================================================================

-- Abordagem segura: primeiro renomear o campo
ALTER TABLE users 
RENAME COLUMN auth_id TO auth_id_deprecated;

-- Verificar se a aplicação funciona normalmente
-- Aguarde alguns dias/horas para confirmar

-- Depois de confirmar que tudo está funcionando, executar:
-- ALTER TABLE users DROP COLUMN auth_id_deprecated;

-- ============================================================================
-- PASSO 7: Remover definitivamente (execute após validação)
-- ============================================================================

-- DESCOMENTE A LINHA ABAIXO SOMENTE APÓS VALIDAR QUE TUDO FUNCIONA:
-- ALTER TABLE users DROP COLUMN IF EXISTS auth_id_deprecated;

-- ============================================================================
-- PASSO 8: Verificar estrutura final da tabela
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- PASSO 9: Verificar integridade dos dados
-- ============================================================================

-- Contar registros antes e depois
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT id) as unique_ids,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
    COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_users
FROM users;

-- Verificar se há usuários duplicados por email
SELECT 
    email,
    COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================================================
-- ROLLBACK DE EMERGÊNCIA (se algo der errado)
-- ============================================================================

-- Se você renomeou o campo e quer reverter:
-- ALTER TABLE users RENAME COLUMN auth_id_deprecated TO auth_id;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Execute os comandos um por vez
-- 2. Verifique os resultados de cada passo
-- 3. Use a abordagem de renomear primeiro (mais segura)
-- 4. Só remova definitivamente após validar a aplicação em produção
-- 5. Se houver políticas RLS usando auth_id, você precisará recriá-las
--    usando o campo 'id' em vez de 'auth_id'
-- ============================================================================
