-- =====================================================
-- Script Alternativo - Remover Duplicados com DELETE
-- =====================================================

-- MÉTODO 2: Usar DELETE com window function (mais direto)

-- 1. BACKUP OBRIGATÓRIO primeiro
CREATE TABLE IF NOT EXISTS codigos_postais_backup_$(date +%Y%m%d) AS 
SELECT * FROM codigos_postais;

-- 2. Verificar duplicados antes da remoção
WITH duplicados AS (
    SELECT 
        id,
        codigo_postal_completo,
        ROW_NUMBER() OVER (
            PARTITION BY codigo_postal_completo 
            ORDER BY id ASC
        ) as row_num
    FROM codigos_postais
)
SELECT 
    'Total registros' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Duplicados a remover' as tipo,
    COUNT(*) as quantidade
FROM duplicados 
WHERE row_num > 1;

-- 3. Remover duplicados (manter apenas o primeiro de cada código postal)
-- EXECUTE APENAS APÓS CONFIRMAR O BACKUP!

/*
WITH duplicados AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY codigo_postal_completo 
            ORDER BY id ASC
        ) as row_num
    FROM codigos_postais
)
DELETE FROM codigos_postais 
WHERE id IN (
    SELECT id 
    FROM duplicados 
    WHERE row_num > 1
);
*/

-- 4. Verificar resultado
SELECT 
    COUNT(*) as total_apos_limpeza,
    COUNT(DISTINCT codigo_postal_completo) as codigos_unicos
FROM codigos_postais;

-- 5. Conferir se ainda há duplicados
SELECT 
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 5;
