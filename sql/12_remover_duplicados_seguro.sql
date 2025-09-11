-- =====================================================
-- Script para Remover Duplicados - MÉTODO SEGURO
-- =====================================================

-- IMPORTANTE: Execute primeiro o script 11_identificar_duplicados.sql
-- para confirmar que existem duplicados antes de executar este

-- MÉTODO 1: Remover duplicados mantendo apenas o registro mais antigo (menor ID)

-- 1. Criar uma tabela temporária com apenas registros únicos
CREATE TEMP TABLE codigos_postais_unicos AS
SELECT DISTINCT ON (
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal
) *
FROM codigos_postais
ORDER BY 
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal,
    id ASC; -- Mantém o primeiro (mais antigo)

-- 2. Verificar quantos registros únicos temos
SELECT 
    'Registros originais' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais
UNION ALL
SELECT 
    'Registros únicos' as tipo,
    COUNT(*) as quantidade
FROM codigos_postais_unicos
UNION ALL
SELECT 
    'Duplicados a remover' as tipo,
    (SELECT COUNT(*) FROM codigos_postais) - (SELECT COUNT(*) FROM codigos_postais_unicos) as quantidade;

-- 3. BACKUP: Criar tabela de backup antes de deletar (IMPORTANTE!)
CREATE TABLE codigos_postais_backup AS 
SELECT * FROM codigos_postais;

-- 4. Deletar todos os registros da tabela original
-- CUIDADO: Só execute se tiver certeza!
-- DELETE FROM codigos_postais;

-- 5. Inserir apenas os registros únicos
-- INSERT INTO codigos_postais 
-- SELECT * FROM codigos_postais_unicos;

-- 6. Verificar resultado final
-- SELECT COUNT(*) as total_apos_limpeza FROM codigos_postais;

-- IMPORTANTE: Descomente as linhas acima APENAS após verificar os dados!
