-- Solução Temporária: Permitir todos usuários autenticados (para DEBUG)
-- Execute este script APENAS para testar se o problema é a verificação de admin
-- ATENÇÃO: Isto permite que qualquer usuário logado gerencie subcategorias!

-- Remover policies antigas
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

-- Policy para INSERT (TEMPORÁRIO: todos usuários autenticados)
CREATE POLICY "Allow authenticated insert on service_subcategories"
ON public.service_subcategories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy para UPDATE (TEMPORÁRIO: todos usuários autenticados)
CREATE POLICY "Allow authenticated update on service_subcategories"
ON public.service_subcategories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy para DELETE (TEMPORÁRIO: todos usuários autenticados)
CREATE POLICY "Allow authenticated delete on service_subcategories"
ON public.service_subcategories
FOR DELETE
TO authenticated
USING (true);

-- Verificar
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'service_subcategories'
ORDER BY policyname;
