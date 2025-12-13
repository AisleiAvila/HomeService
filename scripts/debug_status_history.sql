-- =============================================================================
-- Script de Debug - Verificar Histórico de Status
-- =============================================================================

-- 1. Ver quantos registros existem por solicitação
SELECT 
    service_request_id,
    COUNT(*) as total_registros,
    COUNT(DISTINCT status) as status_unicos,
    MIN(changed_at) as primeira_mudanca,
    MAX(changed_at) as ultima_mudanca
FROM service_requests_status
GROUP BY service_request_id
ORDER BY total_registros DESC;

-- 2. Ver todos os status de uma solicitação específica (ajuste o ID)
SELECT 
    srs.id,
    srs.service_request_id,
    srs.status,
    srs.changed_at,
    u.name as usuario,
    srs.notes
FROM service_requests_status srs
LEFT JOIN users u ON srs.changed_by = u.id
ORDER BY srs.service_request_id, srs.changed_at ASC;

-- 3. Ver se há duplicatas exatas (mesmo status na mesma data/hora)
SELECT 
    service_request_id,
    status,
    changed_at,
    COUNT(*) as duplicatas
FROM service_requests_status
GROUP BY service_request_id, status, changed_at
HAVING COUNT(*) > 1
ORDER BY duplicatas DESC;

-- 4. Verificar a integridade dos dados
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT service_request_id) as solicitacoes_com_historico,
    MIN(changed_at) as primeira_entrada,
    MAX(changed_at) as ultima_entrada
FROM service_requests_status;

-- 5. Ver últimos 20 registros inseridos
SELECT 
    srs.id,
    srs.service_request_id,
    sr.title as titulo,
    srs.status,
    srs.changed_at,
    u.name as usuario,
    srs.notes
FROM service_requests_status srs
LEFT JOIN service_requests sr ON srs.service_request_id = sr.id
LEFT JOIN users u ON srs.changed_by = u.id
ORDER BY srs.id DESC
LIMIT 20;
