-- Migration DOWN: remove fields added by 001_add_subcategory_fields.up.sql

BEGIN;

-- Drop the check constraint first (if exists)
ALTER TABLE IF EXISTS public.service_subcategories
  DROP CONSTRAINT IF EXISTS service_subcategories_type_check;

-- Drop columns if they exist
ALTER TABLE IF EXISTS public.service_subcategories
  DROP COLUMN IF EXISTS description;

ALTER TABLE IF EXISTS public.service_subcategories
  DROP COLUMN IF EXISTS price;

ALTER TABLE IF EXISTS public.service_subcategories
  DROP COLUMN IF EXISTS average_time_minutes;

ALTER TABLE IF EXISTS public.service_subcategories
  DROP COLUMN IF EXISTS type;

COMMIT;
