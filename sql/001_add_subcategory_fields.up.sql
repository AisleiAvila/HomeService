-- Migration UP: add fields to service_subcategories for pricing/quoting and description
-- Adds: type (text), average_time_minutes (integer), price (numeric), description (text)

BEGIN;

-- Add columns if not exists
ALTER TABLE IF EXISTS public.service_subcategories
  ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE IF EXISTS public.service_subcategories
  ADD COLUMN IF NOT EXISTS average_time_minutes INTEGER;

ALTER TABLE IF EXISTS public.service_subcategories
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE IF EXISTS public.service_subcategories
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Optional: add a check constraint for type to restrict values
ALTER TABLE IF EXISTS public.service_subcategories
  ADD CONSTRAINT IF NOT EXISTS service_subcategories_type_check CHECK (type IS NULL OR type IN ('precificado', 'orçado'));

COMMIT;
