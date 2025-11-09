-- Este script remove as Políticas de Segurança a Nível de Linha (RLS) que
-- concediam permissões específicas para o perfil 'client'.
--
-- ATENÇÃO: Os nomes das políticas são suposições baseadas em convenções comuns.
-- Verifique os nomes exatos no seu painel do Supabase (Authentication -> Policies)
-- e ajuste os nomes nos comandos DROP POLICY abaixo, se necessário.

-- Remove a política que permitia clientes visualizarem seus próprios perfis.
DROP POLICY IF EXISTS "Clients can view their own profile." ON public.users;

-- Remove a política que permitia clientes atualizarem seus próprios perfis.
DROP POLICY IF EXISTS "Clients can update their own profile." ON public.users;

-- Remove a política que permitia clientes visualizarem suas próprias solicitações de serviço.
DROP POLICY IF EXISTS "Clients can view their own service requests." ON public.service_requests;

-- Remove a política que permitia clientes criarem solicitações de serviço para si mesmos.
DROP POLICY IF EXISTS "Clients can create their own service requests." ON public.service_requests;

-- Remove a política que permitia clientes atualizarem o status de suas solicitações (ex: aprovar orçamento).
DROP POLICY IF EXISTS "Clients can update their own service requests." ON public.service_requests;
