-- =====================================================
-- Script DEFINITIVO - Remove Duplicados (Supabase Compatible)
-- =====================================================

-- PASSO 1: Backup
CREATE TABLE IF NOT EXISTS codigos_postais_backup AS 
SELECT * FROM codigos_postais;

-- PASSO 2: Verificar situação
SELECT 
    'Total registros' as status,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Códigos únicos' as status,
    COUNT(DISTINCT codigo_postal_completo) as quantidade
FROM codigos_postais;

-- PASSO 3: Método seguro - usar CTE para identificar duplicados
WITH ranked_records AS (
    SELECT 
        id,
        codigo_postal_completo,
        ROW_NUMBER() OVER (
            PARTITION BY codigo_postal_completo 
            ORDER BY id ASC
        ) as rn
    FROM codigos_postais
)
DELETE FROM codigos_postais 
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);

-- PASSO 4: Verificar resultado
SELECT 
    'Após limpeza' as status,
    COUNT(*) as total_registros
FROM codigos_postais;

-- PASSO 5: Confirmar que não há duplicados
SELECT 
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 10;

-- PASSO 6: Se tudo estiver OK, você pode deletar o backup (opcional)
-- DROP TABLE codigos_postais_backup;
