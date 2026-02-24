-- Register Vercel public domain for a tenant (run once in production)
-- Replace target_slug if needed.

begin;

with target_tenant as (
  select id
  from public.tenants
  where slug = 'natan-general-service'
    and status = 'active'
  limit 1
)
insert into public.tenant_domains (
  tenant_id,
  domain,
  is_primary,
  status,
  verified_at,
  updated_at
)
select
  tt.id,
  'natan-general-service.vercel.app',
  true,
  'active',
  now(),
  now()
from target_tenant tt
on conflict (domain)
do update set
  tenant_id = excluded.tenant_id,
  is_primary = excluded.is_primary,
  status = excluded.status,
  verified_at = coalesce(public.tenant_domains.verified_at, excluded.verified_at),
  updated_at = now();

-- Ensure only one primary domain per tenant (optional but recommended)
update public.tenant_domains td
set is_primary = false,
    updated_at = now()
where td.tenant_id = (
    select id from public.tenants where slug = 'natan-general-service' limit 1
  )
  and td.domain <> 'natan-general-service.vercel.app'
  and td.is_primary = true;

commit;

-- Verification queries:
-- select t.slug, td.domain, td.status, td.is_primary, td.verified_at
-- from public.tenant_domains td
-- join public.tenants t on t.id = td.tenant_id
-- where td.domain = 'natan-general-service.vercel.app';
