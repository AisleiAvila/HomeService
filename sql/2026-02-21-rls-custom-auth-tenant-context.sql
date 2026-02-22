-- Multi-tenant context for custom auth + RLS
-- Makes current_tenant_id() resolve tenant from request headers when JWT claim is unavailable.

begin;

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null,
  is_primary boolean not null default false,
  status text not null default 'pending',
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_domains_domain_unique unique (domain),
  constraint tenant_domains_status_ck check (status in ('pending', 'active', 'inactive'))
);

create index if not exists tenant_domains_tenant_id_idx on public.tenant_domains(tenant_id);
create index if not exists tenant_domains_status_idx on public.tenant_domains(status);

create or replace function public.request_headers_json()
returns jsonb
language sql
stable
as $$
  select coalesce(current_setting('request.headers', true), '{}')::jsonb;
$$;

create or replace function public.request_header_value(header_name text)
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      public.request_headers_json() ->> lower(header_name),
      public.request_headers_json() ->> header_name
    ),
    ''
  );
$$;

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
as $$
declare
  jwt_claims jsonb;
  tenant_claim text;
  tenant_from_header text;
  tenant_from_host text;
  tenant_from_subdomain text;
  tenant_from_slug text;
  resolved_tenant_id uuid;
begin
  begin
    jwt_claims := auth.jwt();
  exception
    when others then
      jwt_claims := '{}'::jsonb;
  end;

  tenant_claim := nullif(jwt_claims ->> 'tenant_id', '');

  if tenant_claim is null then
    tenant_claim := nullif(current_setting('request.jwt.claim.tenant_id', true), '');
  end if;

  if tenant_claim is not null then
    begin
      return tenant_claim::uuid;
    exception
      when others then
        null;
    end;
  end if;

  tenant_from_header := public.request_header_value('x-tenant-id');
  if tenant_from_header is not null then
    begin
      return tenant_from_header::uuid;
    exception
      when others then
        null;
    end;
  end if;

  tenant_from_host := lower(public.request_header_value('x-tenant-host'));
  if tenant_from_host is not null then
    select td.tenant_id
      into resolved_tenant_id
      from public.tenant_domains td
      join public.tenants t on t.id = td.tenant_id
     where lower(td.domain) = tenant_from_host
       and td.status = 'active'
       and t.status = 'active'
     limit 1;

    if resolved_tenant_id is not null then
      return resolved_tenant_id;
    end if;
  end if;

  tenant_from_subdomain := public.request_header_value('x-tenant-subdomain');
  tenant_from_slug := public.request_header_value('x-tenant-slug');

  if tenant_from_subdomain is null and tenant_from_slug is null then
    return null;
  end if;

  select t.id
    into resolved_tenant_id
    from public.tenants t
   where t.status = 'active'
     and (
       (tenant_from_subdomain is not null and t.subdomain = tenant_from_subdomain)
       or
       (tenant_from_slug is not null and t.slug = tenant_from_slug)
     )
   limit 1;

  return resolved_tenant_id;
exception
  when others then
    return null;
end;
$$;

commit;
