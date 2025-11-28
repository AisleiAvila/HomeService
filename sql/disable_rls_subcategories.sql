-- SOLUÇÃO DEFINITIVA: Desabilitar RLS completamente
-- Use este script quando a aplicação NÃO usa Supabase Auth
-- A autenticação é customizada, então RLS não funciona

-- 1. Desabilitar RLS na tabela
ALTER TABLE public.service_subcategories DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as policies existentes
DROP POLICY IF EXISTS "Allow authenticated insert on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated update on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated delete on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated select on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin insert on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin update on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin delete on service_subcategories" ON public.service_subcategories;

-- 3. Conceder permissões completas para as roles anon e authenticated
GRANT ALL ON public.service_subcategories TO anon;
GRANT ALL ON public.service_subcategories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE service_subcategories_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE service_subcategories_id_seq TO authenticated;

-- 4. Verificar status final
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'service_subcategories';

-- 5. Confirmar que não há policies
SELECT 
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'service_subcategories';

-- 6. Verificar permissões concedidas
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_subcategories'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
