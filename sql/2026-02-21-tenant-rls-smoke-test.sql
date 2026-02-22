-- Smoke test for tenant isolation with RLS + custom auth headers
-- Execute in Supabase SQL Editor after running tenant migrations.

-- ============================================================
-- 0) PREP: ensure at least two active tenants
-- ============================================================
insert into public.tenants (name, slug, subdomain, status)
values
  ('Default Tenant', 'default', 'default', 'active'),
  ('Tenant B', 'tenant-b', 'tenantb', 'active')
on conflict (slug) do update
set subdomain = excluded.subdomain,
    status = excluded.status,
    updated_at = now();

-- Resolve tenant IDs
with t as (
  select slug, id
  from public.tenants
  where slug in ('default', 'tenant-b')
)
select * from t;

-- ============================================================
-- 1) BASELINE (enforcement OFF)
-- ============================================================
insert into public.app_runtime_settings (key, value)
values ('tenant_enforcement', 'off')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- Clear request headers context (simulates no tenant header)
select set_config('request.headers', '{}', true);

-- With enforcement OFF, reads should work regardless of tenant context
select
  'OFF_no_headers_users' as check_name,
  count(*) as total
from public.users;

select
  'OFF_no_headers_requests' as check_name,
  count(*) as total
from public.service_requests;

-- ============================================================
-- 2) ENFORCEMENT ON + TENANT A headers
-- ============================================================
insert into public.app_runtime_settings (key, value)
values ('tenant_enforcement', 'on')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

select set_config(
  'request.headers',
  jsonb_build_object('x-tenant-slug', 'default')::text,
  true
);

select
  'ON_tenant_default_users' as check_name,
  count(*) as total
from public.users;

select
  'ON_tenant_default_requests' as check_name,
  count(*) as total
from public.service_requests;

-- Optional: inspect sampled IDs to verify all rows belong to default tenant
select u.id, u.tenant_id
from public.users u
limit 20;

-- ============================================================
-- 3) ENFORCEMENT ON + TENANT B headers
-- ============================================================
select set_config(
  'request.headers',
  jsonb_build_object('x-tenant-slug', 'tenant-b')::text,
  true
);

select
  'ON_tenant_b_users' as check_name,
  count(*) as total
from public.users;

select
  'ON_tenant_b_requests' as check_name,
  count(*) as total
from public.service_requests;

-- ============================================================
-- 4) NEGATIVE: no headers with enforcement ON
-- ============================================================
select set_config('request.headers', '{}', true);

-- Expected: 0 rows for tenant-protected tables
select
  'ON_no_headers_users' as check_name,
  count(*) as total
from public.users;

select
  'ON_no_headers_requests' as check_name,
  count(*) as total
from public.service_requests;

-- ============================================================
-- 5) WRITE TEST (insert blocked without tenant context)
-- ============================================================
-- This should fail under enforcement ON because tenant_id cannot be validated
-- Uncomment to test failure behavior:
-- insert into public.enhanced_notifications (user_id, type, title, message, read)
-- values (1, 'general', 'RLS Test', 'Should fail without tenant context', false);

-- ============================================================
-- 6) WRITE TEST (insert allowed with matching tenant context)
-- ============================================================
-- Prepare tenant context
select set_config(
  'request.headers',
  jsonb_build_object('x-tenant-slug', 'default')::text,
  true
);

-- Use an existing user from default tenant
with default_user as (
  select id, tenant_id
  from public.users
  where tenant_id = (select id from public.tenants where slug = 'default')
  order by id
  limit 1
)
insert into public.enhanced_notifications (
  tenant_id,
  user_id,
  type,
  title,
  message,
  read
)
select
  du.tenant_id,
  du.id,
  'general',
  'RLS smoke test',
  'Insert permitted with matching tenant context',
  false
from default_user du
returning id, tenant_id, user_id, created_at;

-- ============================================================
-- 7) CLEANUP (optional)
-- ============================================================
-- delete from public.enhanced_notifications
-- where title = 'RLS smoke test';

-- ============================================================
-- 8) FINAL: revert enforcement if needed
-- ============================================================
-- Keep ON for production rollout, OFF for transitional debugging.
-- insert into public.app_runtime_settings (key, value)
-- values ('tenant_enforcement', 'off')
-- on conflict (key) do update
-- set value = excluded.value,
--     updated_at = now();
