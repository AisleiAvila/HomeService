-- Multi-tenant foundation (phase 1)
-- Safe/idempotent migration to prepare tenant-aware model.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subdomain text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_status_ck check (status in ('active', 'inactive'))
);

insert into public.tenants (name, slug, subdomain)
values ('Default Tenant', 'default', 'default')
on conflict (slug) do nothing;

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
as $$
declare
  jwt_claims jsonb;
  tenant_claim text;
begin
  begin
    jwt_claims := auth.jwt();
  exception
    when others then
      return null;
  end;

  tenant_claim := nullif(jwt_claims ->> 'tenant_id', '');
  if tenant_claim is null then
    return null;
  end if;

  return tenant_claim::uuid;
exception
  when others then
    return null;
end;
$$;

-- Add tenant_id columns to tenant-scoped tables (if table exists).
do $$
declare
  tenant_table_name text;
  tenant_tables text[] := array[
    'users',
    'user_sessions',
    'service_requests',
    'service_requests_status',
    'service_request_value_history',
    'service_request_images',
    'chat_messages',
    'enhanced_notifications',
    'technical_reports',
    'technical_report_signatures',
    'service_clarifications',
    'status_audit_log',
    'user_specialties',
    'contracts',
    'payments',
    'payment_refunds',
    'disputes',
    'extra_service_items',
    'stock_items',
    'service_request_materials',
    'user_warehouses',
    'warehouses',
    'evaluations'
  ];
begin
  foreach tenant_table_name in array tenant_tables loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = tenant_table_name
    ) then
      execute format('alter table public.%I add column if not exists tenant_id uuid', tenant_table_name);
      execute format('create index if not exists %I on public.%I (tenant_id)', tenant_table_name || '_tenant_id_idx', tenant_table_name);
    end if;
  end loop;
end
$$;

-- Backfill users first from default tenant.
do $$
declare
  default_tenant_id uuid;
begin
  select id into default_tenant_id
  from public.tenants
  where slug = 'default'
  limit 1;

  if default_tenant_id is null then
    raise exception 'Default tenant not found';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'tenant_id'
  ) then
    update public.users
       set tenant_id = default_tenant_id
     where tenant_id is null;
  end if;
end
$$;

-- Propagate tenant_id from users to related tables when possible.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='user_sessions') then
    update public.user_sessions s
       set tenant_id = u.tenant_id
      from public.users u
     where s.user_id = u.id
       and s.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='service_requests') then
    update public.service_requests r
       set tenant_id = u.tenant_id
      from public.users u
     where r.created_by_admin_id = u.id
       and r.tenant_id is null;

    update public.service_requests r
       set tenant_id = u.tenant_id
      from public.users u
     where r.professional_id = u.id
       and r.tenant_id is null;

    update public.service_requests r
       set tenant_id = u.tenant_id
      from public.users u
     where r.client_id = u.id
       and r.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_messages') then
    update public.chat_messages m
       set tenant_id = r.tenant_id
      from public.service_requests r
     where m.request_id = r.id
       and m.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='enhanced_notifications') then
    update public.enhanced_notifications n
       set tenant_id = u.tenant_id
      from public.users u
     where n.user_id = u.id
       and n.tenant_id is null;

    update public.enhanced_notifications n
       set tenant_id = r.tenant_id
      from public.service_requests r
     where n.service_request_id = r.id
       and n.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='service_request_images') then
    update public.service_request_images i
       set tenant_id = r.tenant_id
      from public.service_requests r
     where i.service_request_id = r.id
       and i.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='technical_reports') then
    update public.technical_reports t
       set tenant_id = r.tenant_id
      from public.service_requests r
     where t.service_request_id = r.id
       and t.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='technical_report_signatures') then
    update public.technical_report_signatures s
       set tenant_id = t.tenant_id
      from public.technical_reports t
     where s.technical_report_id = t.id
       and s.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='service_clarifications') then
    update public.service_clarifications c
       set tenant_id = r.tenant_id
      from public.service_requests r
     where c.service_request_id = r.id
       and c.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='service_requests_status') then
    update public.service_requests_status h
       set tenant_id = r.tenant_id
      from public.service_requests r
     where h.service_request_id = r.id
       and h.tenant_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='status_audit_log') then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'status_audit_log'
        and column_name = 'request_id'
    ) then
      update public.status_audit_log a
         set tenant_id = r.tenant_id
        from public.service_requests r
       where a.request_id = r.id
         and a.tenant_id is null;
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'status_audit_log'
        and column_name = 'service_request_id'
    ) then
      update public.status_audit_log a
         set tenant_id = r.tenant_id
        from public.service_requests r
       where a.service_request_id = r.id
         and a.tenant_id is null;
    end if;
  end if;
end
$$;

-- Add FK constraints where tables exist.
do $$
declare
  tenant_table_name text;
  fk_name text;
  tenant_tables text[] := array[
    'users',
    'user_sessions',
    'service_requests',
    'service_requests_status',
    'service_request_value_history',
    'service_request_images',
    'chat_messages',
    'enhanced_notifications',
    'technical_reports',
    'technical_report_signatures',
    'service_clarifications',
    'status_audit_log',
    'user_specialties',
    'contracts',
    'payments',
    'payment_refunds',
    'disputes',
    'extra_service_items',
    'stock_items',
    'service_request_materials',
    'user_warehouses',
    'warehouses',
    'evaluations'
  ];
begin
  foreach tenant_table_name in array tenant_tables loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name=tenant_table_name
        and column_name='tenant_id'
    ) then
      fk_name := tenant_table_name || '_tenant_id_fkey';
      if not exists (
        select 1
        from information_schema.table_constraints
        where table_schema='public'
          and table_name=tenant_table_name
          and constraint_name=fk_name
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id) on delete restrict',
          tenant_table_name,
          fk_name
        );
      end if;
    end if;
  end loop;
end
$$;

commit;
