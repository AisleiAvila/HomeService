-- Diagnóstico Detalhado - Execute cada query SEPARADAMENTE para ver os resultados

-- QUERY 1: Ver o que auth.email() retorna
SELECT auth.email() as email_autenticado;

-- QUERY 2: Ver TODOS os usuários admin
SELECT id, email, name, role, status 
FROM public.users 
WHERE role = 'admin';

-- QUERY 3: Ver o usuário que está tentando se autenticar
SELECT id, email, name, role, status, auth_id
FROM public.users
LIMIT 5;

-- QUERY 4: Ver se auth.uid() retorna algo
SELECT auth.uid() as auth_uid_value;

-- QUERY 5: Verificar se existe correspondência por auth_id (mesmo que não seja mais usado)
SELECT 
  id, 
  email, 
  name, 
  role,
  auth_id,
  CASE 
    WHEN auth_id = auth.uid() THEN 'MATCH por auth_id'
    WHEN email = auth.email() THEN 'MATCH por email'
    ELSE 'SEM MATCH'
  END as status_match
FROM public.users
WHERE auth_id = auth.uid() OR email = auth.email();
