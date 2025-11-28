-- Diagnóstico de RLS para service_subcategories
-- Execute este script para verificar a configuração atual

-- 1. Verificar o usuário autenticado atual
SELECT 
  auth.uid() as auth_uid,
  auth.email() as auth_email,
  auth.role() as auth_role;

-- 2. Verificar dados do usuário na tabela users
SELECT 
  id,
  email,
  name,
  role,
  status,
  auth_id
FROM public.users
WHERE email = auth.email();

-- 3. Verificar se existe um admin na tabela
SELECT 
  id,
  email,
  name,
  role,
  status
FROM public.users
WHERE role = 'admin';

-- 4. Verificar as policies ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'service_subcategories'
ORDER BY policyname;

-- 5. Verificar se RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'service_subcategories';

-- 6. Testar a condição da policy manualmente
SELECT 
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.email = auth.email()
    AND users.role = 'admin'
  ) as usuario_e_admin;
