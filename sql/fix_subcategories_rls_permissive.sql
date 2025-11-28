-- Fix RLS policies for service_subcategories table (VERSÃO PERMISSIVA)
-- Execute este script no SQL Editor do Supabase
-- Esta versão permite que TODOS os usuários autenticados gerenciem subcategorias

-- Primeiro, habilitar RLS na tabela (se ainda não estiver ativo)
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem (evitar conflitos)
DROP POLICY IF EXISTS "Allow authenticated insert on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated update on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated delete on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated select on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin insert on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin update on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow admin delete on service_subcategories" ON public.service_subcategories;

-- Policy para SELECT (todos usuários autenticados podem ler)
CREATE POLICY "Allow authenticated select on service_subcategories"
ON public.service_subcategories
FOR SELECT
TO authenticated
USING (true);

-- Policy para INSERT (todos usuários autenticados podem inserir)
CREATE POLICY "Allow authenticated insert on service_subcategories"
ON public.service_subcategories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy para UPDATE (todos usuários autenticados podem atualizar)
CREATE POLICY "Allow authenticated update on service_subcategories"
ON public.service_subcategories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy para DELETE (todos usuários autenticados podem deletar)
CREATE POLICY "Allow authenticated delete on service_subcategories"
ON public.service_subcategories
FOR DELETE
TO authenticated
USING (true);

-- Verificar se as policies foram criadas corretamente
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
WHERE tablename = 'service_subcategories'
ORDER BY policyname;

-- Testar se RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'service_subcategories';
