-- Debug Script para service_requests_status
-- Execute no SQL Editor do Supabase

-- 1. Ver quantos registros existem
SELECT COUNT(*) as total_registros FROM service_requests_status;

-- 2. Ver todos os registros agrupados por service_request_id
SELECT 
  service_request_id,
  COUNT(*) as numero_registros,
  MIN(changed_at) as primeira_mudanca,
  MAX(changed_at) as ultima_mudanca
FROM service_requests_status
GROUP BY service_request_id
ORDER BY MAX(changed_at) DESC;

-- 3. Ver os últimos 50 registros inseridos
SELECT 
  id,
  service_request_id,
  status,
  changed_by,
  changed_at,
  notes
FROM service_requests_status
ORDER BY changed_at DESC
LIMIT 50;

-- 4. Ver a sequência de status de uma solicitação específica
-- Substitua 1 pelo ID real da solicitação
SELECT 
  status,
  changed_at,
  changed_by,
  notes
FROM service_requests_status
WHERE service_request_id = 1
ORDER BY changed_at ASC;

-- 5. Verificar se há alguma política RLS bloqueando
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'service_requests_status';

-- 6. Ver as políticas RLS ativas
SELECT * FROM pg_policies 
WHERE tablename = 'service_requests_status';
