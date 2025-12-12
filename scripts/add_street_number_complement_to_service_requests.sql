-- Migration: Add street_number and complement fields to service_requests table
-- Date: 2025-12-12
-- Description: Adds fields for street number and address complement to service requests

-- Add street_number column (número do logradouro)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS street_number VARCHAR(20);

-- Add complement column (complemento - apto, bloco, etc)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS complement VARCHAR(100);

-- Add comments to document the columns
COMMENT ON COLUMN service_requests.street_number IS 'Número do logradouro';
COMMENT ON COLUMN service_requests.complement IS 'Complemento do endereço (apartamento, bloco, andar, etc)';

-- Optional: Create an index if these fields will be used frequently in searches
-- CREATE INDEX IF NOT EXISTS idx_service_requests_street_number ON service_requests(street_number);

-- Verify the columns were added
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_requests'
  AND column_name IN ('street_number', 'complement');
