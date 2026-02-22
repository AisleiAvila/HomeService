-- Tenant RLS go-live script
-- Purpose: safely enable tenant enforcement with quick rollback path.
-- Usage: run in Supabase SQL Editor after all tenant migrations and smoke tests.

begin;

-- ============================================================
-- 1) PRE-CHECKS
-- ============================================================
-- 1.1 Ensure helper functions exist
select
  proname,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'current_tenant_id',
    'tenant_access_allowed',
    'tenant_write_allowed',
    'is_tenant_enforcement_enabled'
  )
order by proname;

-- 1.2 Ensure tenant_id nullable gaps are known before enforcement
-- (rows with NULL tenant_id will be hidden/blocked when enforcement is ON)
with counts as (
  select 'users' as table_name, count(*) filter (where tenant_id is null) as null_tenant from public.users
  union all select 'service_requests', count(*) filter (where tenant_id is null) from public.service_requests
  union all select 'chat_messages', count(*) filter (where tenant_id is null) from public.chat_messages
  union all select 'enhanced_notifications', count(*) filter (where tenant_id is null) from public.enhanced_notifications
  union all select 'technical_reports', count(*) filter (where tenant_id is null) from public.technical_reports
  union all select 'technical_report_signatures', count(*) filter (where tenant_id is null) from public.technical_report_signatures
  union all select 'service_request_images', count(*) filter (where tenant_id is null) from public.service_request_images
  union all select 'user_sessions', count(*) filter (where tenant_id is null) from public.user_sessions
)
select * from counts order by table_name;

-- ============================================================
-- 2) ENABLE ENFORCEMENT (APP RUNTIME FLAG)
-- ============================================================
insert into public.app_runtime_settings (key, value)
values ('tenant_enforcement', 'on')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- ============================================================
-- 3) POST-ENABLE VALIDATION
-- ============================================================
-- 3.1 Confirm toggle function reports ON
select public.is_tenant_enforcement_enabled() as enforcement_enabled;

-- 3.2 Validate no-context access is restricted (expect 0 for protected tables)
select set_config('request.headers', '{}', true);

select 'users_no_context' as check_name, count(*) as total from public.users;
select 'service_requests_no_context' as check_name, count(*) as total from public.service_requests;

-- 3.3 Validate context access works for a known tenant (replace slug if needed)
select set_config(
  'request.headers',
  jsonb_build_object('x-tenant-slug', 'default')::text,
  true
);

select 'users_default_context' as check_name, count(*) as total from public.users;
select 'service_requests_default_context' as check_name, count(*) as total from public.service_requests;

commit;

-- ============================================================
-- ROLLBACK QUICK COMMANDS (run only if needed)
-- ============================================================
-- insert into public.app_runtime_settings (key, value)
-- values ('tenant_enforcement', 'off')
-- on conflict (key) do update
-- set value = excluded.value,
--     updated_at = now();
