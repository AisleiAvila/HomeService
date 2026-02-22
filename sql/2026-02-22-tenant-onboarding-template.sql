-- Tenant onboarding template (SaaS)
-- Purpose: create/update tenant, register primary domain, and attach an existing admin user.
-- Edit the variables in the DECLARE block before running.

begin;

do $$
declare
  v_tenant_name text := 'Tenant B';
  v_tenant_slug text := 'tenant-b';
  v_tenant_subdomain text := 'tenantb';
  v_primary_domain text := 'tenantb.seudominio.com';
  v_admin_email text := 'admin@tenantb.com';

  v_tenant_id uuid;
  v_user_id bigint;
begin
  -- 1) Upsert tenant
  insert into public.tenants (name, slug, subdomain, status)
  values (v_tenant_name, v_tenant_slug, v_tenant_subdomain, 'active')
  on conflict (slug) do update
  set name = excluded.name,
      subdomain = excluded.subdomain,
      status = 'active',
      updated_at = now()
  returning id into v_tenant_id;

  if v_tenant_id is null then
    select t.id into v_tenant_id
    from public.tenants t
    where t.slug = v_tenant_slug
    limit 1;
  end if;

  if v_tenant_id is null then
    raise exception 'Falha ao obter tenant_id para slug=%', v_tenant_slug;
  end if;

  -- 2) Upsert primary domain
  insert into public.tenant_domains (tenant_id, domain, is_primary, status, verified_at)
  values (v_tenant_id, lower(v_primary_domain), true, 'active', now())
  on conflict (domain) do update
  set tenant_id = excluded.tenant_id,
      is_primary = true,
      status = 'active',
      verified_at = coalesce(public.tenant_domains.verified_at, now()),
      updated_at = now();

  -- Keep a single primary domain per tenant (best effort)
  update public.tenant_domains td
  set is_primary = case when lower(td.domain) = lower(v_primary_domain) then true else false end,
      updated_at = now()
  where td.tenant_id = v_tenant_id;

  -- 3) Attach existing user as tenant admin
  select u.id into v_user_id
  from public.users u
  where lower(u.email) = lower(v_admin_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário admin não encontrado por email: % (crie o usuário antes e rode novamente)', v_admin_email;
  end if;

  update public.users
  set tenant_id = v_tenant_id,
      role = 'admin',
      status = 'Active'
  where id = v_user_id;

  raise notice 'Tenant onboarded: id=%, slug=%, domain=%, admin_user_id=%',
    v_tenant_id, v_tenant_slug, v_primary_domain, v_user_id;
end
$$;

commit;

-- Optional validation queries:
-- select id, name, slug, subdomain, status from public.tenants where slug = 'tenant-b';
-- select domain, status, is_primary, tenant_id from public.tenant_domains where tenant_id = (select id from public.tenants where slug = 'tenant-b');
-- select id, email, role, status, tenant_id from public.users where lower(email) = lower('admin@tenantb.com');
