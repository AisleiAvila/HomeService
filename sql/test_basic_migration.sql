-- TESTE BÁSICO: Adicionar apenas os campos essenciais
-- Execute este script primeiro para testar se a estrutura básica funciona

BEGIN;

-- Adicionar apenas os campos principais
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS proposed_execution_date TIMESTAMPTZ NULL;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS proposed_execution_notes TEXT NULL;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS execution_date_proposed_at TIMESTAMPTZ NULL;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS execution_date_approval TEXT NULL;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS execution_date_approved_at TIMESTAMPTZ NULL;

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS execution_date_rejection_reason TEXT NULL;

-- Adicionar a constraint depois se a adição básica funcionar
DO $$
BEGIN
    -- Tentar adicionar a constraint de check
    BEGIN
        ALTER TABLE service_requests
        DROP CONSTRAINT IF EXISTS service_requests_execution_date_approval_check;
        
        ALTER TABLE service_requests
        ADD CONSTRAINT service_requests_execution_date_approval_check 
        CHECK (execution_date_approval IN ('approved', 'rejected') OR execution_date_approval IS NULL);
        
        RAISE NOTICE 'CHECK constraint added successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add CHECK constraint: %', SQLERRM;
    END;
END;
$$;

-- Verificar se os campos foram adicionados
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name LIKE '%execution%'
ORDER BY column_name;

COMMIT;

-- Mensagem de sucesso
SELECT 'Migration fields added successfully!' as status;