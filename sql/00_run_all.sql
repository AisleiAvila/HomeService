-- =====================================================
-- Script Master - Executar Todos os Scripts em Ordem
-- =====================================================

-- Este script executa todos os outros scripts na ordem correta
-- Use este script para configurar completamente o sistema de endereços

\echo '=== Iniciando Configuração do Sistema de Endereços de Portugal ==='

\echo '1. Criando tabelas...'
\i 01_create_tables_portugal_addresses.sql

\echo '2. Criando índices...'
\i 02_create_indexes_portugal_addresses.sql

\echo '3. Inserindo distritos...'
\i 03_insert_distritos.sql

\echo '4. Inserindo concelhos...'
\i 04_insert_concelhos.sql

\echo '5. Configurando políticas RLS...'
\i 06_configure_rls_policies.sql

\echo '6. Criando funções e views...'
\i 07_create_functions_views.sql

\echo '=== NOTA: Códigos postais devem ser importados separadamente ==='
\echo 'Execute o script 05_insert_codigos_postais.sql ou use o comando COPY'
\echo 'para importar o arquivo codigos_postais.csv'

\echo '=== Configuração Básica Concluída ==='

-- Verificar criação das tabelas
\echo 'Verificando tabelas criadas:'
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('distritos', 'concelhos', 'codigos_postais')
ORDER BY table_name;

-- Verificar dados inseridos
\echo 'Verificando dados inseridos:'
SELECT 
    'distritos' as tabela,
    COUNT(*) as total
FROM distritos
UNION ALL
SELECT 
    'concelhos' as tabela,
    COUNT(*) as total
FROM concelhos
UNION ALL
SELECT 
    'codigos_postais' as tabela,
    COUNT(*) as total
FROM codigos_postais;

\echo '=== Exemplos de Uso das Funções ==='
\echo 'SELECT * FROM buscar_por_codigo_postal(''1000-001'');'
\echo 'SELECT * FROM buscar_por_localidade(''Lisboa'');'
\echo 'SELECT * FROM buscar_por_distrito_concelho(''Lisboa'', ''Lisboa'');'
\echo 'SELECT validar_codigo_postal(''1000-001'');'
\echo 'SELECT * FROM buscar_endereco_texto(''Rua Augusta Lisboa'');'
