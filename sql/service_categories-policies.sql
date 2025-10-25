-- service_categories-policies.sql
-- Políticas RLS para a tabela `public.service_categories`.
-- Este arquivo resolve o erro 403 (Forbidden) ao buscar categorias de serviço.
-- 
-- INSTRUÇÕES:
-- 1. Abra o SQL Editor do Supabase
-- 2. Cole e execute este script
-- 3. Verifique que as policies foram criadas executando as queries de verificação no final

-- =====================================================
-- HABILITAR RLS (Row Level Security) na tabela
-- =====================================================
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE LEITURA (SELECT)
-- Permitir que todos os usuários autenticados leiam as categorias
-- =====================================================
CREATE POLICY "Allow authenticated users to read service_categories"
ON public.service_categories
FOR SELECT
TO authenticated
USING (true);

-- Permitir também leitura para usuários não autenticados (público)
-- Isso é útil se você mostrar categorias na landing page
CREATE POLICY "Allow public to read service_categories"
ON public.service_categories
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- POLÍTICAS DE INSERÇÃO (INSERT)
-- Apenas administradores podem criar categorias
-- =====================================================
CREATE POLICY "Allow admin insert on service_categories"
ON public.service_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS DE ATUALIZAÇÃO (UPDATE)
-- Apenas administradores podem atualizar categorias
-- =====================================================
CREATE POLICY "Allow admin update on service_categories"
ON public.service_categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS DE EXCLUSÃO (DELETE)
-- Apenas administradores podem excluir categorias
-- =====================================================
CREATE POLICY "Allow admin delete on service_categories"
ON public.service_categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- VERIFICAÇÕES (execute após criar as policies)
-- =====================================================

-- 1. Verificar que as policies foram criadas
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
WHERE tablename = 'service_categories'
ORDER BY policyname;

-- 2. Verificar que RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'service_categories';

-- 3. Testar query de SELECT (deve retornar dados)
SELECT id, name, created_at
FROM public.service_categories
ORDER BY name;

-- 4. Contar categorias existentes
SELECT COUNT(*) as total_categories
FROM public.service_categories;

-- =====================================================
-- EXEMPLO DE INSERÇÃO DE CATEGORIAS (opcional)
-- Execute apenas se precisar popular a tabela
-- =====================================================
/*
INSERT INTO public.service_categories (name) VALUES
  ('Canalizador'),
  ('Eletricista'),
  ('Pintor'),
  ('Carpinteiro'),
  ('Pedreiro'),
  ('Jardineiro'),
  ('Limpeza'),
  ('Ar Condicionado'),
  ('Eletrodomésticos'),
  ('Vidraceiro')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- ROLLBACK (use apenas se precisar remover as policies)
-- =====================================================
/*
DROP POLICY IF EXISTS "Allow authenticated users to read service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Allow public to read service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Allow admin insert on service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Allow admin update on service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Allow admin delete on service_categories" ON public.service_categories;

-- Para desabilitar RLS completamente (não recomendado)
-- ALTER TABLE public.service_categories DISABLE ROW LEVEL SECURITY;
*/

-- =====================================================
-- NOTAS DE SEGURANÇA
-- =====================================================
-- ✓ Leitura (SELECT): Permitida para todos (autenticados e anônimos)
--   - Útil para exibir categorias em formulários e landing page
-- 
-- ✓ Escrita (INSERT/UPDATE/DELETE): Apenas administradores
--   - Valida role='admin' na tabela users usando auth.uid()
--   - Previne que clientes e profissionais modifiquem categorias
--
-- ✓ RLS ativo garante que apenas queries autorizadas funcionem
--   - Proteção contra acesso direto à API do Supabase
--   - Políticas aplicadas automaticamente em todas as queries
