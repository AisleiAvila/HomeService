-- Fix RLS policies for service_subcategories table
-- Execute este script no SQL Editor do Supabase

-- Primeiro, habilitar RLS na tabela (se ainda não estiver ativo)
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem (evitar conflitos)
DROP POLICY IF EXISTS "Allow authenticated insert on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated update on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated delete on service_subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated select on service_subcategories" ON public.service_subcategories;

-- Policy para SELECT (todos usuários autenticados podem ler)
CREATE POLICY "Allow authenticated select on service_subcategories"
ON public.service_subcategories
FOR SELECT
TO authenticated
USING (true);

-- Policy para INSERT (apenas admins podem inserir)
CREATE POLICY "Allow admin insert on service_subcategories"
ON public.service_subcategories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.email = auth.email()
    AND users.role = 'admin'
  )
);

-- Policy para UPDATE (apenas admins podem atualizar)
CREATE POLICY "Allow admin update on service_subcategories"
ON public.service_subcategories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.email = auth.email()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.email = auth.email()
    AND users.role = 'admin'
  )
);

-- Policy para DELETE (apenas admins podem deletar)
CREATE POLICY "Allow admin delete on service_subcategories"
ON public.service_subcategories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.email = auth.email()
    AND users.role = 'admin'
  )
);

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
