-- Este script recria as Políticas de Segurança a Nível de Linha (RLS)
-- que foram removidas, restaurando as permissões para o perfil 'client'.
--
-- As definições das políticas são baseadas em uma implementação padrão.
-- Se suas políticas originais eram diferentes, ajuste o código abaixo.

-- Recria a política para clientes visualizarem seus próprios perfis.
CREATE POLICY "Clients can view their own profile."
ON public.users FOR SELECT
USING (auth.uid() = id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client');

-- Recria a política para clientes atualizarem seus próprios perfis.
CREATE POLICY "Clients can update their own profile."
ON public.users FOR UPDATE
USING (auth.uid() = id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client');

-- Recria a política para clientes visualizarem suas próprias solicitações de serviço.
CREATE POLICY "Clients can view their own service requests."
ON public.service_requests FOR SELECT
USING (auth.uid() = client_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client');

-- Recria a política para clientes criarem solicitações de serviço.
CREATE POLICY "Clients can create their own service requests."
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = client_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client');

-- Recria a política para clientes atualizarem suas solicitações.
CREATE POLICY "Clients can update their own service requests."
ON public.service_requests FOR UPDATE
USING (auth.uid() = client_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client');
