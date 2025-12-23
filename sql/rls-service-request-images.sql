-- ========================================
-- CONFIGURAÇÃO RLS PARA service_request_images
-- ========================================
-- IMPORTANTE: Esta aplicação NÃO usa o sistema de Auth do Supabase
-- A autenticação é gerenciada por um backend customizado com sessão em localStorage
-- Portanto, as políticas RLS baseadas em auth.uid() não funcionam
--
-- SOLUÇÃO: Desabilitar RLS para esta tabela
-- A segurança é garantida pela lógica da aplicação (service-image.service.ts)
-- que verifica permissões antes de qualquer operação

-- Remover todas as políticas existentes (se houver)
DROP POLICY IF EXISTS "select_service_request_images" ON service_request_images;
DROP POLICY IF EXISTS "insert_service_request_images" ON service_request_images;
DROP POLICY IF EXISTS "update_service_request_images" ON service_request_images;
DROP POLICY IF EXISTS "delete_service_request_images" ON service_request_images;

-- Desabilitar RLS na tabela
ALTER TABLE service_request_images DISABLE ROW LEVEL SECURITY;

-- ========================================
-- NOTA DE SEGURANÇA
-- ========================================
-- A segurança é implementada em nível de aplicação através do service-image.service.ts
-- que valida:
-- 1. Usuário autenticado
-- 2. Permissões de upload (cliente, profissional ou admin do pedido)
-- 3. Permissões de exclusão (uploader, cliente, profissional ou admin)
-- 4. Permissões de visualização (participantes do pedido)
--
-- Esta abordagem é adequada para aplicações com autenticação customizada
-- onde o Supabase é usado apenas como banco de dados, não como provedor de auth

-- ========================================
-- VERIFICAR STATUS DO RLS
-- ========================================
-- Para verificar se o RLS está desabilitado, execute:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'service_request_images';
-- 
-- rowsecurity deve ser 'false'
