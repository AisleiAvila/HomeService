-- Verificação de Autenticação e Permissões
-- Execute este script para entender o problema de autenticação

-- 1. Verificar se RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'service_subcategories';

-- 2. Listar todas as policies (deve estar vazio se RLS foi desabilitado)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_subcategories';

-- 3. Tentar inserir manualmente (como service_role/superuser)
-- Se isto funcionar, o problema é autenticação client-side
INSERT INTO public.service_subcategories (name, category_id, type, price, average_time_minutes, description)
VALUES ('Teste Manual SQL', 1, 'precificado', 50.00, 30, 'Teste de inserção direta')
RETURNING *;

-- 4. Verificar permissões da tabela
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_subcategories'
AND table_schema = 'public';

-- 5. Verificar se a role 'authenticated' tem permissões
SELECT 
  has_table_privilege('authenticated', 'public.service_subcategories', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.service_subcategories', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.service_subcategories', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.service_subcategories', 'DELETE') as can_delete;
