-- =====================================================
-- Script Simples e Rápido - Remove Duplicados
-- =====================================================

-- Este é o método mais simples e seguro para o Supabase

-- 1. BACKUP obrigatório
CREATE TABLE codigos_postais_backup AS 
SELECT * FROM codigos_postais;

-- 2. Verificar situação atual
SELECT 
    'Total registros' as status,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Códigos únicos' as status,
    COUNT(DISTINCT codigo_postal_completo) as quantidade
FROM codigos_postais;

-- 3. Criar tabela temporária apenas com registros únicos
CREATE TEMP TABLE temp_unicos AS
SELECT DISTINCT ON (codigo_postal_completo) *
FROM codigos_postais
ORDER BY codigo_postal_completo, id ASC;

-- 4. Contar registros únicos
SELECT COUNT(*) as registros_unicos FROM temp_unicos;

-- 5. Limpar tabela original e reinserir únicos
TRUNCATE TABLE codigos_postais RESTART IDENTITY;

INSERT INTO codigos_postais (
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal,
    created_at, updated_at
)
SELECT 
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal,
    NOW() as created_at,
    NOW() as updated_at
FROM temp_unicos
ORDER BY codigo_postal_completo;

-- 6. Verificar resultado final
SELECT 
    'Após limpeza' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_postal_completo) as codigos_unicos
FROM codigos_postais;

-- 7. Confirmar que não há mais duplicados
SELECT 
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 5;

-- Se a query acima não retornar nenhum resultado, a limpeza foi bem-sucedida!
