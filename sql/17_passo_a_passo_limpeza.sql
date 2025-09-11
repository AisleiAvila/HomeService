-- =====================================================
-- EXECUTE PASSO A PASSO - Não execute tudo de uma vez!
-- =====================================================

-- ✅ PASSO 1: Fazer backup (OBRIGATÓRIO)
-- Execute esta linha primeiro:

CREATE TABLE codigos_postais_backup AS SELECT * FROM codigos_postais;

-- ✅ PASSO 2: Verificar a situação atual
-- Execute para ver quantos duplicados existem:

SELECT 
    'Total registros' as status,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Códigos únicos' as status,
    COUNT(DISTINCT codigo_postal_completo) as quantidade
FROM codigos_postais;

-- ✅ PASSO 3: Ver alguns exemplos de duplicados
-- Execute para confirmar que há duplicados:

SELECT 
    codigo_postal_completo,
    COUNT(*) as duplicados
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
ORDER BY duplicados DESC
LIMIT 5;

-- ✅ PASSO 4: Remover duplicados (CUIDADO!)
-- Execute APENAS após confirmar os passos anteriores:

DELETE FROM codigos_postais 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM codigos_postais 
    GROUP BY codigo_postal_completo
);

-- ✅ PASSO 5: Verificar resultado
-- Execute para confirmar que funcionou:

SELECT 
    'Registros após limpeza' as status,
    COUNT(*) as quantidade
FROM codigos_postais;

-- ✅ PASSO 6: Confirmar que não há mais duplicados
-- Execute - deve retornar 0 linhas se funcionou:

SELECT 
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
LIMIT 5;

-- ✅ PASSO 7: Comparar com backup
-- Execute para ver a diferença:

SELECT 
    'Backup' as fonte,
    COUNT(*) as total
FROM codigos_postais_backup
UNION ALL
SELECT 
    'Atual' as fonte,
    COUNT(*) as total
FROM codigos_postais;

-- 🗑️ OPCIONAL: Deletar backup (só se tudo estiver OK)
-- DROP TABLE codigos_postais_backup;
