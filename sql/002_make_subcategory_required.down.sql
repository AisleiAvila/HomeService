-- Removemos a restrição NOT NULL
ALTER TABLE service_requests
ALTER COLUMN subcategory_id DROP NOT NULL;

-- Removemos a chave estrangeira se existir
ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS fk_service_requests_subcategory;