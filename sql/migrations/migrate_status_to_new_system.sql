-- ============================================================================
-- Script de Migração: Atualização de Status para Novo Sistema (11 Status)
-- Data: 2025-11-29
-- Descrição: Migra status do sistema antigo (23+ status com orçamentos)
--            para o novo sistema simplificado (11 status sem orçamentos)
-- ============================================================================

-- IMPORTANTE: Execute este script em uma transação para poder reverter em caso de erro
-- Para executar: copie e cole no SQL Editor do Supabase

BEGIN;

-- ============================================================================
-- PASSO 1: Análise de Dados Antes da Migração
-- ============================================================================

-- Visualizar distribuição de status atuais
SELECT 
    status,
    COUNT(*) as total_requests,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM service_requests), 2) as percentage
FROM service_requests
GROUP BY status
ORDER BY total_requests DESC;

-- Identificar status que serão migrados
SELECT DISTINCT status
FROM service_requests
WHERE status NOT IN (
    'Solicitado',
    'Atribuído',
    'Aguardando Confirmação',
    'Aceito',
    'Recusado',
    'Data Definida',
    'Em Progresso',
    'Aguardando Finalização',
    'Pagamento Feito',
    'Concluído',
    'Cancelado'
)
ORDER BY status;

-- ============================================================================
-- PASSO 2: Backup de Segurança (Criar Tabela Temporária)
-- ============================================================================

-- Criar backup dos status atuais
CREATE TEMP TABLE service_requests_status_backup AS
SELECT 
    id,
    status
FROM service_requests;

-- Verificar backup
SELECT COUNT(*) as total_backed_up FROM service_requests_status_backup;

-- ============================================================================
-- PASSO 3: Migração de Status (Mapeamento Completo)
-- ============================================================================

-- 3.1: Migrar "Em análise" → "Solicitado"
UPDATE service_requests
SET status = 'Solicitado'
WHERE status IN ('Em análise', 'InAnalysis', 'Requested');

-- 3.2: Migrar "Aguardando esclarecimentos" → "Solicitado"
UPDATE service_requests
SET status = 'Solicitado'
WHERE status = 'Aguardando esclarecimentos' OR status = 'AwaitingClarifications';

-- 3.3: Migrar "Buscando profissional" → "Solicitado"
UPDATE service_requests
SET status = 'Solicitado'
WHERE status IN ('Buscando profissional', 'SearchingProfessional');

-- 3.4: Migrar "Profissional selecionado" → "Atribuído"
UPDATE service_requests
SET status = 'Atribuído'
WHERE status IN ('Profissional selecionado', 'ProfessionalSelected');

-- 3.5: Migrar status de orçamento → "Aguardando Confirmação"
UPDATE service_requests
SET status = 'Aguardando Confirmação'
WHERE status IN (
    'Orçamento enviado',
    'QuoteSent',
    'Aguardando aprovação do orçamento',
    'AwaitingQuoteApproval',
    'Aguardando confirmação do profissional',
    'AwaitingProfessionalConfirmation'
);

-- 3.6: Migrar "Orçamento aprovado" e status de aprovação → "Aceito"
UPDATE service_requests
SET status = 'Aceito'
WHERE status IN (
    'Orçamento aprovado',
    'QuoteApproved',
    'Aprovado',
    'Approved',
    'Aguardando data de execução',
    'AwaitingExecutionDate',
    'Data proposta pelo administrador',
    'DateProposedByAdmin',
    'Aguardando aprovação da data',
    'AwaitingDateApproval',
    'Data aprovada pelo cliente',
    'Data aprovada',
    'DateApproved',
    'DateApprovedByClient'
);

-- 3.7: Migrar "Orçamento rejeitado" e rejeições → "Recusado"
UPDATE service_requests
SET status = 'Recusado'
WHERE status IN (
    'Orçamento rejeitado',
    'QuoteRejected',
    'Rejeitado',
    'Rejected',
    'Data rejeitada pelo cliente',
    'Data rejeitada',
    'DateRejected',
    'DateRejectedByClient'
);

-- 3.8: Migrar "Agendado" → "Data Definida"
UPDATE service_requests
SET status = 'Data Definida'
WHERE status IN ('Agendado', 'Scheduled');

-- 3.9: Migrar "Em execução" → "Em Progresso"
UPDATE service_requests
SET status = 'Em Progresso'
WHERE status IN ('Em execução', 'InProgress');

-- 3.10: Migrar "Concluído - Aguardando aprovação" → "Aguardando Finalização"
UPDATE service_requests
SET status = 'Aguardando Finalização'
WHERE status IN ('Concluído - Aguardando aprovação', 'CompletedAwaitingApproval');

-- 3.11: Migrar "Pago" → "Pagamento Feito"
UPDATE service_requests
SET status = 'Pagamento Feito'
WHERE status IN ('Pago', 'Paid');

-- 3.12: Migrar "Finalizado" e "Completed" → "Concluído"
UPDATE service_requests
SET status = 'Concluído'
WHERE status IN ('Finalizado', 'Completed');

-- 3.13: Garantir que "Cancelado" está padronizado
UPDATE service_requests
SET status = 'Cancelado'
WHERE status IN ('Cancelled', 'Canceled');

-- ============================================================================
-- PASSO 4: Validação Pós-Migração
-- ============================================================================

-- Verificar se todos os status foram migrados corretamente
SELECT 
    status,
    COUNT(*) as total_requests
FROM service_requests
GROUP BY status
ORDER BY total_requests DESC;

-- Identificar qualquer status que não seja do novo sistema
SELECT 
    id,
    status,
    title
FROM service_requests
WHERE status NOT IN (
    'Solicitado',
    'Atribuído',
    'Aguardando Confirmação',
    'Aceito',
    'Recusado',
    'Data Definida',
    'Em Progresso',
    'Aguardando Finalização',
    'Pagamento Feito',
    'Concluído',
    'Cancelado'
)
ORDER BY id DESC;

-- Comparar total antes e depois
SELECT 
    'Antes da Migração' as momento,
    COUNT(*) as total
FROM service_requests_status_backup
UNION ALL
SELECT 
    'Após Migração' as momento,
    COUNT(*) as total
FROM service_requests;

-- Relatório detalhado de mudanças
SELECT 
    b.status as status_antigo,
    r.status as status_novo,
    COUNT(*) as total_migrados
FROM service_requests_status_backup b
JOIN service_requests r ON b.id = r.id
WHERE b.status != r.status
GROUP BY b.status, r.status
ORDER BY total_migrados DESC;

-- ============================================================================
-- PASSO 5: Atualizar status_history (se existir)
-- ============================================================================

-- Verificar se há histórico de status para atualizar
SELECT COUNT(*) as total_with_history
FROM service_requests
WHERE status_history IS NOT NULL AND status_history != '[]';

-- Nota: O histórico de status é um array JSON que pode conter status antigos.
-- Para uma migração completa, seria necessário também atualizar os registros
-- dentro do array status_history, mas isso requer lógica mais complexa.
-- Por enquanto, os status_history antigos serão mantidos como registro histórico.

-- ============================================================================
-- PASSO 6: Estatísticas Finais
-- ============================================================================

-- Resumo final da distribuição de status
SELECT 
    status,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM service_requests), 2) as percentage
FROM service_requests
GROUP BY status
ORDER BY total DESC;

-- Total de registros migrados
SELECT 
    COUNT(DISTINCT b.id) as total_registros_migrados
FROM service_requests_status_backup b
JOIN service_requests r ON b.id = r.id
WHERE b.status != r.status;

-- ============================================================================
-- PASSO 7: Commit ou Rollback
-- ============================================================================

-- IMPORTANTE: Revise os resultados acima antes de executar COMMIT
-- Se tudo estiver correto, execute: COMMIT;
-- Se houver problemas, execute: ROLLBACK;

-- Aguardando confirmação manual...
-- Descomente a linha abaixo após revisão:
-- COMMIT;

-- Para reverter em caso de erro:
-- ROLLBACK;

-- ============================================================================
-- PASSO 8: Limpeza (Execute após COMMIT bem-sucedido)
-- ============================================================================

-- Após confirmar que a migração foi bem-sucedida, você pode:
-- 1. Remover a tabela de backup temporária (ela será removida automaticamente ao fim da sessão)
-- 2. Executar VACUUM ANALYZE para otimizar a tabela
-- 
-- VACUUM ANALYZE service_requests;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Este script atualiza APENAS a coluna 'status' em service_requests
-- 2. Campos deprecated como quote_amount, quote_description continuam existindo
--    mas não são mais usados pela aplicação
-- 3. O histórico de status (status_history) mantém registros antigos como arquivo
-- 4. Sempre teste em ambiente de desenvolvimento primeiro
-- 5. Faça backup completo do banco antes de executar em produção
-- 6. Monitore logs de aplicação após a migração para identificar problemas

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
