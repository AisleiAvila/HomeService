-- =====================================================
-- Script de Configuração de Row Level Security (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE distritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_postais ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (dados geográficos são geralmente públicos)
CREATE POLICY "Permitir leitura pública de distritos" 
    ON distritos FOR SELECT 
    USING (true);

CREATE POLICY "Permitir leitura pública de concelhos" 
    ON concelhos FOR SELECT 
    USING (true);

CREATE POLICY "Permitir leitura pública de códigos postais" 
    ON codigos_postais FOR SELECT 
    USING (true);

-- Políticas para admin/service_role (inserção, atualização, exclusão)
CREATE POLICY "Permitir todas as operações para service_role - distritos" 
    ON distritos FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Permitir todas as operações para service_role - concelhos" 
    ON concelhos FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Permitir todas as operações para service_role - códigos postais" 
    ON codigos_postais FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Políticas para usuários autenticados (se necessário)
-- Descomente se quiser permitir que usuários autenticados façam atualizações
/*
CREATE POLICY "Permitir atualizações para usuários autenticados - distritos" 
    ON distritos FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Permitir atualizações para usuários autenticados - concelhos" 
    ON concelhos FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Permitir atualizações para usuários autenticados - códigos postais" 
    ON codigos_postais FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
*/

-- Verificar políticas criadas
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
WHERE tablename IN ('distritos', 'concelhos', 'codigos_postais')
ORDER BY tablename, policyname;
