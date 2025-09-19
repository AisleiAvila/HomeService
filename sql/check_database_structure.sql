-- Script para verificar a estrutura da base de dados
-- Use este script para entender a estrutura antes de executar a migração

-- Verificar se a tabela service_requests existe e listar suas colunas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_requests'
ORDER BY ordinal_position;

-- Verificar se existe uma tabela users ou profiles
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('users', 'profiles', 'user', 'profile')
AND table_schema = 'public';

-- Verificar algumas linhas da tabela service_requests para entender os dados
SELECT 
    id, 
    status, 
    client_id, 
    professional_id,
    title
FROM service_requests 
LIMIT 5;