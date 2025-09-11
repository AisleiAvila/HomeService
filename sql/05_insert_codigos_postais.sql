-- =====================================================
-- Script para Carregar Códigos Postais a partir do CSV
-- =====================================================

-- Opção 1: Usando COPY para carregar direto do arquivo CSV
-- (Execute este comando no ambiente onde tem acesso ao arquivo)
-- COPY codigos_postais (
--     cod_distrito, cod_concelho, cod_localidade, nome_localidade, 
--     cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2, 
--     nome_arteria, local_arteria, troco, porta, cliente, 
--     num_cod_postal, ext_cod_postal, desig_postal
-- ) 
-- FROM 'C:\Users\aisle\Downloads\codigos_postais.csv' 
-- WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

-- Opção 2: Criar tabela temporária para carregar os dados primeiro
CREATE TEMP TABLE temp_codigos_postais (
    cod_distrito VARCHAR(2),
    cod_concelho VARCHAR(2),
    cod_localidade VARCHAR(10),
    nome_localidade VARCHAR(100),
    cod_arteria VARCHAR(20),
    tipo_arteria VARCHAR(50),
    prep1 VARCHAR(10),
    titulo_arteria VARCHAR(50),
    prep2 VARCHAR(10),
    nome_arteria VARCHAR(100),
    local_arteria VARCHAR(100),
    troco VARCHAR(100),
    porta VARCHAR(20),
    cliente VARCHAR(100),
    num_cod_postal VARCHAR(4),
    ext_cod_postal VARCHAR(3),
    desig_postal VARCHAR(100)
);

-- Carregar dados na tabela temporária
-- COPY temp_codigos_postais FROM 'C:\Users\aisle\Downloads\codigos_postais.csv' 
-- WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

-- Inserir dados da tabela temporária para a tabela principal com validações
INSERT INTO codigos_postais (
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal
)
SELECT 
    TRIM(cod_distrito),
    TRIM(cod_concelho),
    NULLIF(TRIM(cod_localidade), ''),
    NULLIF(TRIM(nome_localidade), ''),
    NULLIF(TRIM(cod_arteria), ''),
    NULLIF(TRIM(tipo_arteria), ''),
    NULLIF(TRIM(prep1), ''),
    NULLIF(TRIM(titulo_arteria), ''),
    NULLIF(TRIM(prep2), ''),
    NULLIF(TRIM(nome_arteria), ''),
    NULLIF(TRIM(local_arteria), ''),
    NULLIF(TRIM(troco), ''),
    NULLIF(TRIM(porta), ''),
    NULLIF(TRIM(cliente), ''),
    TRIM(num_cod_postal),
    TRIM(ext_cod_postal),
    TRIM(desig_postal)
FROM temp_codigos_postais
WHERE TRIM(cod_distrito) != '' 
  AND TRIM(cod_concelho) != ''
  AND TRIM(num_cod_postal) ~ '^[0-9]{4}$'
  AND TRIM(ext_cod_postal) ~ '^[0-9]{3}$'
  AND EXISTS (
      SELECT 1 FROM concelhos c 
      WHERE c.cod_distrito = TRIM(temp_codigos_postais.cod_distrito)
        AND c.cod_concelho = TRIM(temp_codigos_postais.cod_concelho)
  )
ON CONFLICT DO NOTHING;

-- Limpar tabela temporária
DROP TABLE temp_codigos_postais;

-- Verificação dos dados inseridos
SELECT COUNT(*) as total_codigos_postais FROM codigos_postais;

SELECT 
    d.nome_distrito,
    COUNT(cp.id) as total_codigos_postais
FROM distritos d
LEFT JOIN codigos_postais cp ON d.cod_distrito = cp.cod_distrito
GROUP BY d.cod_distrito, d.nome_distrito
ORDER BY total_codigos_postais DESC;

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
