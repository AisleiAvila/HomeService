-- Primeiro, atualizamos registros existentes que não têm subcategoria
UPDATE service_requests
SET subcategory_id = (
    SELECT id FROM service_subcategories 
    WHERE category_id = service_requests.category_id 
    LIMIT 1
)
WHERE subcategory_id IS NULL;

-- Depois alteramos a coluna para NOT NULL
ALTER TABLE service_requests
ALTER COLUMN subcategory_id SET NOT NULL;

-- Adicionamos a restrição de chave estrangeira se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'service_requests' 
        AND column_name = 'subcategory_id'
    ) THEN
        ALTER TABLE service_requests
        ADD CONSTRAINT fk_service_requests_subcategory
        FOREIGN KEY (subcategory_id)
        REFERENCES service_subcategories(id);
    END IF;
END $$;