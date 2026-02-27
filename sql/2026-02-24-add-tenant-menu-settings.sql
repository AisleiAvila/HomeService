-- Tenant menu settings by role
-- Allows each tenant to choose which menu items are available per role.

begin;

create table if not exists public.tenant_menu_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null,
  enabled_items jsonb not null default '[]'::jsonb,
  updated_by bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_menu_settings_unique unique (tenant_id, role),
  constraint tenant_menu_settings_role_check check (
    role in (
      'admin',
      'super_user',
      'professional',
      'professional_almoxarife',
      'almoxarife',
      'secretario'
    )
  ),
  constraint tenant_menu_settings_enabled_items_array_check check (jsonb_typeof(enabled_items) = 'array')
);

create index if not exists tenant_menu_settings_tenant_id_idx
  on public.tenant_menu_settings(tenant_id);

create index if not exists tenant_menu_settings_role_idx
  on public.tenant_menu_settings(role);

-- Seed defaults for existing tenants, mirroring current menu behavior.
insert into public.tenant_menu_settings (tenant_id, role, enabled_items)
select t.id, x.role, x.enabled_items
from public.tenants t
cross join (
  values
    ('admin', '["overview","requests","approvals","finances","stock-intake","daily-mileage","clients","tenants","categories","extra-services","profile"]'::jsonb),
    ('super_user', '["overview","requests","approvals","finances","stock-intake","daily-mileage","clients","tenants","categories","extra-services","profile"]'::jsonb),
    ('professional', '["dashboard","schedule","daily-mileage","profile"]'::jsonb),
    ('professional_almoxarife', '["dashboard","schedule","daily-mileage","stock-intake","profile"]'::jsonb),
    ('almoxarife', '["stock-intake","profile"]'::jsonb),
    ('secretario', '["agenda","requests","stock-intake","profile"]'::jsonb)
) as x(role, enabled_items)
on conflict (tenant_id, role) do nothing;

commit;
