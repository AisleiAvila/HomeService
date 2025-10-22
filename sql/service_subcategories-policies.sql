-- service_subcategories-policies.sql
-- Políticas RLS e exemplos para a tabela `public.service_subcategories`.
-- Instruções: abra o SQL editor do Supabase e cole apenas a variante que deseja aplicar.
-- Execute as verificações ao final para confirmar que as policies foram criadas e que INSERT/UPDATE/DELETE funcionam.

-- =====================================================
-- VARIANTE A — Permitir INSERT / UPDATE / DELETE para usuários autenticados (TO authenticated)
-- (Mais comum: permite que usuários logados realizem operações via client-side JWT)
-- =====================================================

-- INSERT
CREATE POLICY "Allow authenticated insert on service_subcategories"
ON public.service_subcategories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Allow authenticated update on service_subcategories"
ON public.service_subcategories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE (opcional)
CREATE POLICY "Allow authenticated delete on service_subcategories"
ON public.service_subcategories
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- VARIANTE B — Permitir apenas ADMINS (requer claim `auth.role` = 'admin' no JWT)
-- (Use quando apenas administradores devem poder alterar registros)
-- =====================================================

-- INSERT (admin-only)
-- CREATE POLICY "Allow admin insert on service_subcategories"
-- ON public.service_subcategories
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (auth.role = 'admin');

-- UPDATE (admin-only)
-- CREATE POLICY "Allow admin update on service_subcategories"
-- ON public.service_subcategories
-- FOR UPDATE
-- TO authenticated
-- USING (auth.role = 'admin')
-- WITH CHECK (auth.role = 'admin');

-- DELETE (admin-only)
-- CREATE POLICY "Allow admin delete on service_subcategories"
-- ON public.service_subcategories
-- FOR DELETE
-- TO authenticated
-- USING (auth.role = 'admin');

-- =====================================================
-- VARIANTE C — Acesso apenas via service_role (server-side)
-- (Não é necessário criar policy para a role `service_role`. Use a chave do service_role somente em ambientes de backend confiáveis.)
-- =====================================================

-- =====================================================
-- Exemplos de INSERT / UPDATE / DELETE para testar
-- Execute estes comandos no SQL editor (como um superuser/service_role) para testar
-- Substitua category_id por um id de categoria válido na sua base.
-- =====================================================

-- Exemplo INSERT
INSERT INTO public.service_subcategories (name, category_id, type, average_time_minutes, price, description)
VALUES ('Teste Inserir SQL', 1, 'precificado', 60, 120.00, 'Subcategoria criada via SQL para teste');

-- Exemplo UPDATE (ajuste o id conforme seu ambiente)
UPDATE public.service_subcategories
SET name = 'Teste Atualizado SQL', price = 150.00, average_time_minutes = 90, description = 'Atualizado via SQL'
WHERE id = 1
RETURNING *;

-- Exemplo DELETE (apenas se quiser testar remoção)
DELETE FROM public.service_subcategories WHERE id = 999 RETURNING *;

-- =====================================================
-- Consultas de verificação (execute após criar policies)
-- =====================================================

-- Verificar policies
SELECT policyname, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'service_subcategories';

-- Conferir que a tabela retorna linhas
SELECT id, name, category_id, type, average_time_minutes, price, description
FROM public.service_subcategories
LIMIT 50;

-- Verificar relrowsecurity (RLS ativo?)
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'service_subcategories';

-- =====================================================
-- Rollback / remover policies (se necessário)
-- Use apenas se quiser apagar as policies criadas.
-- =====================================================

-- DROP POLICY "Allow authenticated insert on service_subcategories" ON public.service_subcategories;
-- DROP POLICY "Allow authenticated update on service_subcategories" ON public.service_subcategories;
-- DROP POLICY "Allow authenticated delete on service_subcategories" ON public.service_subcategories;

-- DROP POLICY "Allow admin insert on service_subcategories" ON public.service_subcategories;
-- DROP POLICY "Allow admin update on service_subcategories" ON public.service_subcategories;
-- DROP POLICY "Allow admin delete on service_subcategories" ON public.service_subcategories;

-- =====================================================
-- Notas e segurança
-- - Se sua aplicação usa claims customizadas no JWT (por ex. role), valide que `auth.role` está disponível nas policies.
-- - Para operações sensíveis ou que requerem validação (ex.: owner_id), prefira escrever expressões mais restritivas em USING / WITH CHECK.
-- - Para ações server-side programáticas, prefira usar a chave `service_role` em ambientes backend e não expor essa chave no cliente.
-- =====================================================
