-- Tenant profile management foundation (admin own-tenant + super_user cross-tenant)
-- Safe/idempotent migration.

begin;

alter table public.tenants
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists address text,
  add column if not exists locality text,
  add column if not exists postal_code text,
  add column if not exists logo_url text,
  add column if not exists updated_by bigint;

alter table public.tenants
  alter column updated_at set default now();

create index if not exists tenants_status_idx on public.tenants(status);
create index if not exists tenants_updated_by_idx on public.tenants(updated_by);

-- Keep tenant status convention strict and lowercase.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_status_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

-- Contact email validation (if provided).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_contact_email_format_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_contact_email_format_check
      check (
        contact_email is null
        or contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      );
  end if;
end $$;

-- Portuguese postal code format XXXX-XXX (if provided).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_postal_code_format_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_postal_code_format_check
      check (
        postal_code is null
        or postal_code ~ '^\d{4}-\d{3}$'
      );
  end if;
end $$;

-- Logo URL format (if provided): only http/https.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_logo_url_scheme_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_logo_url_scheme_check
      check (
        logo_url is null
        or logo_url ~* '^https?://'
      );
  end if;
end $$;

-- Audit FK (nullable) for updated_by.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_updated_by_fkey'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_updated_by_fkey
      foreign key (updated_by) references public.users(id)
      on delete set null;
  end if;
end $$;

-- Authorization helper used by API.
create or replace function public.user_can_edit_tenant(p_user_id bigint, p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.users su
      where su.id = p_user_id
        and su.role = 'super_user'
        and public.user_can_access_tenant(p_user_id, p_tenant_id)
    )
    or exists (
      select 1
      from public.users a
      where a.id = p_user_id
        and a.role = 'admin'
        and a.tenant_id = p_tenant_id
    );
$$;

commit;
