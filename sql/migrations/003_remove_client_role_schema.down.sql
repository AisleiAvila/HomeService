-- Este script reverte as alterações feitas pelo '003_remove_client_role_schema.up.sql'.
-- ATENÇÃO: A primeira instrução pode falhar se existirem solicitações de serviço com 'client_id' nulo.
-- Certifique-se de associar todas as solicitações a um cliente antes de executar este script.

-- 1. Torna a coluna 'client_id' obrigatória novamente.
ALTER TABLE public.service_requests
ALTER COLUMN client_id SET NOT NULL;

-- 2. Remove a restrição de verificação de papéis atual.
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. Readiciona a restrição de verificação original, incluindo o papel 'client'.
ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'professional', 'client'));
