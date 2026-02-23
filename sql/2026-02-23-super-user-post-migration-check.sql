-- Post-migration verification for super_user cross-tenant access foundation
-- Read-only checks (safe to execute in Supabase SQL Editor)

-- ============================================================
-- 1) Schema objects must exist
-- ============================================================
select 'user_tenant_access_table' as check_name, to_regclass('public.user_tenant_access') as value;
select 'super_user_audit_log_table' as check_name, to_regclass('public.super_user_audit_log') as value;

select
  'user_sessions.active_tenant_id_column' as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_sessions'
      and column_name = 'active_tenant_id'
  ) as value;

select
  'user_can_access_tenant_function' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'user_can_access_tenant'
  ) as value;

-- ============================================================
-- 2) Indexes expected by migration
-- ============================================================
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'user_tenant_access_user_id_idx',
    'user_tenant_access_tenant_id_idx',
    'user_tenant_access_active_idx',
    'user_sessions_active_tenant_id_idx',
    'super_user_audit_log_actor_idx',
    'super_user_audit_log_tenant_idx',
    'super_user_audit_log_action_idx'
  )
order by indexname;

-- ============================================================
-- 3) Data consistency: active_tenant_id backfill
--    Expect 0 rows after migration
-- ============================================================
select count(*) as sessions_without_active_tenant_but_with_tenant
from public.user_sessions
where tenant_id is not null
  and active_tenant_id is null;

-- ============================================================
-- 4) Optional smoke checks (parameterized examples)
--    Replace placeholders before running.
-- ============================================================
-- select public.user_can_access_tenant(<super_user_id>, '<tenant_uuid>') as can_access;
-- select public.user_can_access_tenant(<regular_user_id>, '<other_tenant_uuid>') as can_access;

-- ============================================================
-- 5) Quick visibility into current super_user population
-- ============================================================
select id, email, role, tenant_id, status
from public.users
where role = 'super_user'
order by id;
