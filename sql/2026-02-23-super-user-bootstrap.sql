-- Super user bootstrap helper
-- Use in Supabase SQL Editor when smoke test fails with:
-- "Authenticated role 'admin' is not allowed. Use a user with role 'super_user'."

-- ============================================================
-- 1) List current super users
-- ============================================================
select id, email, name, role, status, tenant_id
from public.users
where role = 'super_user'
order by id;

-- ============================================================
-- 2) Find candidate admin accounts to promote
-- ============================================================
select id, email, name, role, status, tenant_id
from public.users
where role in ('admin', 'super_user')
order by role, id;

-- ============================================================
-- 3) Promote a specific account to super_user (manual)
--    Replace <EMAIL_OR_ID> and execute only if intended.
-- ============================================================
-- If this update fails with users_role_check violation,
-- first run: sql/2026-02-23-allow-super-user-in-users-role-check.sql
--
-- update public.users
-- set role = 'super_user'
-- where email = '<EMAIL_OR_ID>';

-- OR by id:
-- update public.users
-- set role = 'super_user'
-- where id = <USER_ID>;

-- ============================================================
-- 4) Optional: grant explicit tenant access rows
--    Usually not required because current function user_can_access_tenant
--    already grants global access for role super_user.
-- ============================================================
-- insert into public.user_tenant_access (user_id, tenant_id, is_active, granted_reason)
-- values (<USER_ID>, '<TENANT_UUID>', true, 'bootstrap super user access')
-- on conflict (user_id, tenant_id)
-- do update set is_active = true, granted_reason = excluded.granted_reason, updated_at = now();

-- ============================================================
-- 5) Re-check final state
-- ============================================================
select id, email, name, role, status, tenant_id
from public.users
where id = <USER_ID>
   or email = '<EMAIL_OR_ID>';
