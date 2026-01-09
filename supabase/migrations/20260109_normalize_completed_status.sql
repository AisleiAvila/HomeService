-- Normaliza status legado "completed" para o novo status "Concluído"
-- Objetivo: garantir que não existam mais registros com status antigo no banco.

update public.service_requests
set status = 'Concluído'
where lower(status) = 'completed';

update public.service_requests_status
set status = 'Concluído'
where lower(status) = 'completed';
