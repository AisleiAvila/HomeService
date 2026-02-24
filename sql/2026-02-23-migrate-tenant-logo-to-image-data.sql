-- Migrate tenant logo from URL to embedded image data (data URL)
-- Safe/idempotent migration.

begin;

alter table public.tenants
  add column if not exists logo_image_data text;

-- Legacy cleanup (drop logo_url) is handled by 2026-02-23-drop-legacy-tenant-logo-url.sql.

-- Logo image data validation (if provided): data:image/{png|jpeg|jpg|webp};base64,...
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_logo_image_data_format_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_logo_image_data_format_check
      check (
        logo_image_data is null
        or logo_image_data ~* '^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$'
      );
  end if;
end $$;

-- Basic size guard to avoid oversized payloads (~3.5MB chars max).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_logo_image_data_size_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_logo_image_data_size_check
      check (
        logo_image_data is null
        or char_length(logo_image_data) <= 3500000
      );
  end if;
end $$;

commit;
