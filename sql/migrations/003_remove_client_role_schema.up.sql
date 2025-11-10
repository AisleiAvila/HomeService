-- Otimizado: Combina limpeza de dados e alterações de esquema para evitar erros de constraint.

-- ETAPA 1: Limpeza de Dados (anteriormente no script 004)
-- ATENÇÃO: As operações de exclusão são destrutivas e irreversíveis.

-- 1.1. Desassocia todas as solicitações de serviço existentes de qualquer cliente.
UPDATE public.service_requests
SET client_id = NULL
WHERE client_id IS NOT NULL;

-- 1.2. Remove os usuários 'client' da tabela de autenticação do Supabase ('auth.users').
-- A exclusão aqui irá propagar (cascade) para a tabela 'users'.
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.users WHERE role = 'client');

-- 1.3. (Garantia) Remove diretamente os perfis 'client' da tabela 'users'.
-- Redundante se o cascade funcionar, mas garante a limpeza.
DELETE FROM public.users
WHERE role = 'client';


-- ETAPA 2: Alterações de Esquema

-- 2.1. Torna a coluna 'client_id' opcional (nullable) na tabela 'service_requests'.
ALTER TABLE public.service_requests
ALTER COLUMN client_id DROP NOT NULL;

-- 2.2. Remove a restrição de verificação (CHECK constraint) existente na coluna 'role'.
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

-- 2.3. Adiciona a nova restrição de verificação que permite apenas 'admin' e 'professional'.
-- Isto agora funcionará porque todos os utilizadores 'client' foram removidos na ETAPA 1.
ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'professional'));
