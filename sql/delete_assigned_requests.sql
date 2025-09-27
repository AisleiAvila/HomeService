-- Script para excluir solicitações com status = 'assigned' (ou 'Assigned')
DELETE FROM service_requests WHERE status = 'assigned' OR status = 'Assigned';
-- Opcional: mostrar quantas linhas foram afetadas
-- SELECT COUNT(*) FROM service_requests WHERE status = 'assigned' OR status = 'Assigned';