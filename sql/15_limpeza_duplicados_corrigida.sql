-- =====================================================
-- Script CORRIGIDO - Remove Duplicados (Versão 2)
-- =====================================================

-- Este script corrige o problema de tipos de dados

-- 1. BACKUP obrigatório
CREATE TABLE IF NOT EXISTS codigos_postais_backup AS 
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

-- 3. Identificar e deletar duplicados mantendo apenas o primeiro registro
-- (baseado no menor ID para cada código postal único)
DELETE FROM codigos_postais 
WHERE id NOT IN (
    SELECT id 
    FROM (
        SELECT DISTINCT ON (codigo_postal_completo) id
        FROM codigos_postais
        ORDER BY codigo_postal_completo, id ASC
    ) as primeiros_registros
);

-- 4. Verificar resultado final
SELECT 
    'Após limpeza' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_postal_completo) as codigos_unicos
FROM codigos_postais;

-- 5. Confirmar que não há mais duplicados
SELECT 
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 5;

-- 6. Estatísticas finais
SELECT 
    'Registros finais' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Backup disponível' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais_backup;

-- Se a query do passo 5 não retornar nenhum resultado, a limpeza foi bem-sucedida!
