-- =====================================================
-- Script para Identificar e Remover Duplicados
-- =====================================================

-- 1. PRIMEIRO: Verificar a situação atual
SELECT 
    'Total de registros' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Registros únicos (por código postal)' as tipo,
    COUNT(DISTINCT codigo_postal_completo) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Possíveis duplicados' as tipo,
    COUNT(*) - COUNT(DISTINCT codigo_postal_completo) as quantidade
FROM codigos_postais;

-- 2. Identificar duplicados por código postal
SELECT 
    codigo_postal_completo,
    COUNT(*) as total_duplicados
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY total_duplicados DESC, codigo_postal_completo
LIMIT 20;

-- 3. Ver exemplos de registros duplicados
SELECT 
    id,
    codigo_postal_completo,
    desig_postal,
    nome_localidade,
    nome_arteria,
    created_at
FROM codigos_postais 
WHERE codigo_postal_completo IN (
    SELECT codigo_postal_completo
    FROM codigos_postais
    GROUP BY codigo_postal_completo
    HAVING COUNT(*) > 1
)
ORDER BY codigo_postal_completo, id
LIMIT 10;
