-- =====================================================
-- Script para Importar Códigos Postais via COPY
-- =====================================================

-- IMPORTANTE: Este comando só funciona se você tiver acesso direto ao servidor
-- Para Supabase, use a interface de importação CSV ou a Opção 3

-- Se estiver executando localmente com psql:
-- \COPY codigos_postais (cod_distrito, cod_concelho, cod_localidade, nome_localidade, cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2, nome_arteria, local_arteria, troco, porta, cliente, num_cod_postal, ext_cod_postal, desig_postal) FROM 'C:\Users\aisle\Downloads\codigos_postais.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

-- Para verificar a importação
SELECT COUNT(*) as total_codigos_postais FROM codigos_postais;

-- Verificar alguns exemplos
SELECT 
    codigo_postal_completo,
    desig_postal,
    tipo_arteria,
    nome_arteria,
    nome_localidade
FROM codigos_postais 
WHERE cod_distrito = '11' -- Lisboa
ORDER BY num_cod_postal, ext_cod_postal
LIMIT 10;
