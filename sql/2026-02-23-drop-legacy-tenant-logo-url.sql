-- Drop legacy tenant logo_url field after migration to logo_image_data
-- Safe/idempotent cleanup migration.

begin;

alter table public.tenants
  drop constraint if exists tenants_logo_url_scheme_check;

alter table public.tenants
  drop column if exists logo_url;

commit;
