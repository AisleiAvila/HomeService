-- Tenant-aware RLS policies (phase 2, safe rollout)
-- This migration is safe for phased rollout because enforcement can be toggled
-- using table flag in public.app_runtime_settings (default off).

begin;

create table if not exists public.app_runtime_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_runtime_settings (key, value)
values ('tenant_enforcement', 'off')
on conflict (key) do nothing;

create or replace function public.is_tenant_enforcement_enabled()
returns boolean
language sql
stable
as $$
  select lower(coalesce((
    select ars.value
    from public.app_runtime_settings ars
    where ars.key = 'tenant_enforcement'
    limit 1
  ), 'off')) in ('on', 'true', '1');
$$;

create or replace function public.tenant_access_allowed(row_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    case
      when not public.is_tenant_enforcement_enabled() then true
      else row_tenant_id is not null and row_tenant_id = public.current_tenant_id()
    end;
$$;

create or replace function public.tenant_write_allowed(row_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    case
      when not public.is_tenant_enforcement_enabled() then true
      else row_tenant_id is not null and row_tenant_id = public.current_tenant_id()
    end;
$$;

do $$
declare
  tenant_table_name text;
  tenant_tables text[] := array[
    'users',
    'user_specialties',
    'service_requests',
    'service_requests_status',
    'service_request_value_history',
    'service_request_materials',
    'chat_messages',
    'service_clarifications',
    'status_audit_log',
    'enhanced_notifications',
    'technical_reports',
    'technical_report_signatures',
    'service_request_images',
    'user_sessions',
    'contracts',
    'payments',
    'payment_refunds',
    'disputes',
    'extra_service_items',
    'stock_items',
    'warehouses',
    'user_warehouses',
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
      execute format('alter table public.%I enable row level security', tenant_table_name);

      execute format('drop policy if exists %I on public.%I', tenant_table_name || '_tenant_select', tenant_table_name);
      execute format('drop policy if exists %I on public.%I', tenant_table_name || '_tenant_insert', tenant_table_name);
      execute format('drop policy if exists %I on public.%I', tenant_table_name || '_tenant_update', tenant_table_name);
      execute format('drop policy if exists %I on public.%I', tenant_table_name || '_tenant_delete', tenant_table_name);

      execute format(
        'create policy %I on public.%I for select using (public.tenant_access_allowed(tenant_id))',
        tenant_table_name || '_tenant_select',
        tenant_table_name
      );

      execute format(
        'create policy %I on public.%I for insert with check (public.tenant_write_allowed(tenant_id))',
        tenant_table_name || '_tenant_insert',
        tenant_table_name
      );

      execute format(
        'create policy %I on public.%I for update using (public.tenant_access_allowed(tenant_id)) with check (public.tenant_write_allowed(tenant_id))',
        tenant_table_name || '_tenant_update',
        tenant_table_name
      );

      execute format(
        'create policy %I on public.%I for delete using (public.tenant_access_allowed(tenant_id))',
        tenant_table_name || '_tenant_delete',
        tenant_table_name
      );
    end if;
  end loop;
end
$$;

commit;
