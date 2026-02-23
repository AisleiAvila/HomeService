-- Super user foundation: cross-tenant access mapping, active tenant session context, and audit log
-- Safe/idempotent migration.

begin;

-- 1) Explicit user -> tenant access map for cross-tenant operators (e.g. super_user)
create table if not exists public.user_tenant_access (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  is_active boolean not null default true,
  granted_by bigint references public.users(id) on delete set null,
  granted_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tenant_access_unique unique (user_id, tenant_id)
);

create index if not exists user_tenant_access_user_id_idx on public.user_tenant_access(user_id);
create index if not exists user_tenant_access_tenant_id_idx on public.user_tenant_access(tenant_id);
create index if not exists user_tenant_access_active_idx on public.user_tenant_access(is_active);

-- 2) Session-level active tenant (used by super_user tenant switching)
alter table public.user_sessions
  add column if not exists active_tenant_id uuid references public.tenants(id) on delete restrict;

create index if not exists user_sessions_active_tenant_id_idx
  on public.user_sessions(active_tenant_id);

update public.user_sessions
   set active_tenant_id = tenant_id
 where active_tenant_id is null
   and tenant_id is not null;

-- 3) Super user audit log (mandatory audit trail)
create table if not exists public.super_user_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id bigint not null references public.users(id) on delete restrict,
  actor_role text not null,
  action text not null,
  target_tenant_id uuid references public.tenants(id) on delete set null,
  target_resource text,
  target_resource_id text,
  request_path text,
  request_method text,
  ip_address text,
  user_agent text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists super_user_audit_log_actor_idx
  on public.super_user_audit_log(actor_user_id, created_at desc);
create index if not exists super_user_audit_log_tenant_idx
  on public.super_user_audit_log(target_tenant_id, created_at desc);
create index if not exists super_user_audit_log_action_idx
  on public.super_user_audit_log(action, created_at desc);

-- 4) Helper for backend/API to verify if user can operate in a tenant
create or replace function public.user_can_access_tenant(p_user_id bigint, p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.users su
      where su.id = p_user_id
        and su.role = 'super_user'
    )
    or exists (
      select 1
      from public.users u
      where u.id = p_user_id
        and u.tenant_id = p_tenant_id
    )
    or exists (
      select 1
      from public.user_tenant_access uta
      where uta.user_id = p_user_id
        and uta.tenant_id = p_tenant_id
        and uta.is_active = true
    );
$$;

commit;
