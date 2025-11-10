-- Adicionar o status "Aguardando confirmação do profissional" ao enum de status de service_requests
-- Execute este script no painel SQL do Supabase

-- Verificar se a tabela service_requests usa um tipo enum para status
-- Se usar, precisamos adicionar o novo valor ao enum
-- Se usar TEXT/VARCHAR, não precisamos fazer nada

-- Opção 1: Se estiver usando ENUM (PostgreSQL)
-- ALTER TYPE service_request_status ADD VALUE IF NOT EXISTS 'Aguardando confirmação do profissional';

-- Opção 2: Se estiver usando CHECK constraint com valores específicos
-- Primeiro, remover a constraint antiga (se existir)
-- ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Depois, adicionar nova constraint com todos os valores permitidos
-- ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check 
-- CHECK (status IN (
--   'Pending',
--   'Quoted', 
--   'Approved',
--   'In Progress',
--   'Completed',
--   'Canceled',
--   'Aguardando confirmação do profissional'
-- ));

-- Opção 3: Se estiver usando apenas TEXT/VARCHAR sem restrições
-- Neste caso, não precisa fazer nada, o valor pode ser inserido diretamente

-- Verificar o tipo da coluna status:
SELECT 
  column_name, 
  data_type, 
  udt_name,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_requests' 
AND column_name = 'status';

-- Verificar se há constraints na coluna status:
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'service_requests'
AND con.conname LIKE '%status%';

-- Depois de executar as queries acima, descomente e execute a opção correta
