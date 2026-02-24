-- Post-migration verification for tenant profile management foundation
-- Read-only checks (safe to execute in Supabase SQL Editor)

-- ============================================================
-- 1) Columns created on tenants
-- ============================================================
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tenants'
  and column_name in (
    'phone',
    'contact_email',
    'address',
    'locality',
    'postal_code',
    'logo_image_data',
    'updated_by'
  )
order by column_name;

-- ============================================================
-- 2) Expected constraints and function
-- ============================================================
select conname
from pg_constraint
where conrelid = 'public.tenants'::regclass
  and conname in (
    'tenants_status_check',
    'tenants_contact_email_format_check',
    'tenants_postal_code_format_check',
    'tenants_logo_image_data_format_check',
    'tenants_logo_image_data_size_check',
    'tenants_updated_by_fkey'
  )
order by conname;

select
  'user_can_edit_tenant_function' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'user_can_edit_tenant'
  ) as value;

-- ============================================================
-- 3) Expected indexes
-- ============================================================
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'tenants_status_idx',
    'tenants_updated_by_idx'
  )
order by indexname;

-- ============================================================
-- 4) Optional smoke checks (replace placeholders)
-- ============================================================
-- select public.user_can_edit_tenant(<admin_user_id>, '<admin_tenant_uuid>') as admin_can_edit_own;
-- select public.user_can_edit_tenant(<admin_user_id>, '<other_tenant_uuid>') as admin_can_edit_other;
-- select public.user_can_edit_tenant(<super_user_id>, '<tenant_uuid>') as super_user_can_edit;
