-- SaaS billing foundation for tenant subscriptions and access blocking
-- Safe/idempotent: enforcement defaults to off and can be enabled later.

begin;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  amount_cents integer not null,
  currency text not null default 'EUR',
  billing_interval text not null default 'month',
  max_users integer,
  max_service_requests integer,
  is_active boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_amount_cents_ck check (amount_cents >= 0),
  constraint billing_plans_currency_ck check (currency ~ '^[A-Z]{3}$'),
  constraint billing_plans_interval_ck check (billing_interval in ('month', 'year'))
);

create table if not exists public.tenant_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text,
  vat_number text,
  tax_region text not null default 'PT',
  billing_email text,
  billing_address jsonb,
  payment_provider text,
  provider_customer_id text,
  is_tax_exempt boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id),
  constraint tenant_billing_profiles_tax_region_ck check (char_length(tax_region) between 2 and 8)
);

create index if not exists tenant_billing_profiles_tenant_id_idx on public.tenant_billing_profiles (tenant_id);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  billing_plan_id uuid references public.billing_plans(id) on delete set null,
  provider_subscription_id text,
  status text not null,
  payment_status text,
  currency text not null default 'EUR',
  amount_cents integer,
  quantity integer not null default 1,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_until timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_subscriptions_status_ck check (status in ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired')),
  constraint tenant_subscriptions_amount_cents_ck check (amount_cents is null or amount_cents >= 0),
  constraint tenant_subscriptions_currency_ck check (currency ~ '^[A-Z]{3}$'),
  constraint tenant_subscriptions_quantity_ck check (quantity > 0)
);

create index if not exists tenant_subscriptions_tenant_id_idx on public.tenant_subscriptions (tenant_id);
create index if not exists tenant_subscriptions_status_idx on public.tenant_subscriptions (status);
create unique index if not exists tenant_subscriptions_provider_subscription_id_uidx
  on public.tenant_subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.tenant_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tenant_subscription_id uuid references public.tenant_subscriptions(id) on delete set null,
  provider_invoice_id text,
  invoice_number text,
  status text not null,
  amount_due_cents integer not null,
  amount_paid_cents integer not null default 0,
  amount_remaining_cents integer not null default 0,
  currency text not null default 'EUR',
  due_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  hosted_invoice_url text,
  pdf_url text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_invoices_status_ck check (status in ('draft', 'open', 'paid', 'past_due', 'uncollectible', 'void')),
  constraint tenant_invoices_amount_due_ck check (amount_due_cents >= 0),
  constraint tenant_invoices_amount_paid_ck check (amount_paid_cents >= 0),
  constraint tenant_invoices_amount_remaining_ck check (amount_remaining_cents >= 0),
  constraint tenant_invoices_currency_ck check (currency ~ '^[A-Z]{3}$')
);

create index if not exists tenant_invoices_tenant_id_idx on public.tenant_invoices (tenant_id);
create index if not exists tenant_invoices_status_idx on public.tenant_invoices (status);
create unique index if not exists tenant_invoices_provider_invoice_id_uidx
  on public.tenant_invoices (provider_invoice_id)
  where provider_invoice_id is not null;

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  constraint billing_webhook_events_provider_ck check (char_length(provider) > 0)
);

create unique index if not exists billing_webhook_events_provider_event_uidx
  on public.billing_webhook_events (provider, event_id);

create table if not exists public.app_runtime_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_runtime_settings (key, value)
values ('billing_enforcement', 'off')
on conflict (key) do nothing;

insert into public.app_runtime_settings (key, value)
values ('billing_default_grace_days', '7')
on conflict (key) do nothing;

create or replace function public.is_billing_enforcement_enabled()
returns boolean
language sql
stable
as $$
  select lower(coalesce((
    select ars.value
    from public.app_runtime_settings ars
    where ars.key = 'billing_enforcement'
    limit 1
  ), 'off')) in ('on', 'true', '1');
$$;

create or replace function public.billing_default_grace_days()
returns integer
language sql
stable
as $$
  select greatest(0, coalesce((
    select nullif(ars.value, '')::integer
    from public.app_runtime_settings ars
    where ars.key = 'billing_default_grace_days'
    limit 1
  ), 7));
$$;

create or replace function public.tenant_billing_access_allowed(row_tenant_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  latest_sub record;
  grace_end timestamptz;
begin
  if row_tenant_id is null then
    return false;
  end if;

  if not public.is_billing_enforcement_enabled() then
    return true;
  end if;

  select
    ts.id,
    ts.status,
    ts.current_period_end,
    ts.grace_until
  into latest_sub
  from public.tenant_subscriptions ts
  where ts.tenant_id = row_tenant_id
  order by coalesce(ts.current_period_end, ts.updated_at, ts.created_at) desc, ts.created_at desc
  limit 1;

  if latest_sub.id is null then
    -- During migration rollout, tenants without subscription remain allowed.
    return true;
  end if;

  if latest_sub.status in ('active', 'trialing') then
    return true;
  end if;

  if latest_sub.status = 'past_due' then
    grace_end := coalesce(
      latest_sub.grace_until,
      case
        when latest_sub.current_period_end is not null
          then latest_sub.current_period_end + make_interval(days => public.billing_default_grace_days())
        else null
      end
    );

    return grace_end is not null and grace_end >= now();
  end if;

  if latest_sub.status in ('unpaid', 'canceled', 'incomplete', 'incomplete_expired') then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.tenant_billing_state(row_tenant_id uuid)
returns table (
  access_allowed boolean,
  billing_status text,
  grace_until timestamptz,
  current_period_end timestamptz,
  subscription_id uuid
)
language plpgsql
stable
as $$
declare
  latest_sub record;
  computed_grace timestamptz;
begin
  if row_tenant_id is null then
    return query select false, 'invalid_tenant'::text, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  select
    ts.id,
    ts.status,
    ts.current_period_end,
    ts.grace_until
  into latest_sub
  from public.tenant_subscriptions ts
  where ts.tenant_id = row_tenant_id
  order by coalesce(ts.current_period_end, ts.updated_at, ts.created_at) desc, ts.created_at desc
  limit 1;

  if latest_sub.id is null then
    return query select true, 'no_subscription'::text, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  computed_grace := coalesce(
    latest_sub.grace_until,
    case
      when latest_sub.status = 'past_due' and latest_sub.current_period_end is not null
        then latest_sub.current_period_end + make_interval(days => public.billing_default_grace_days())
      else null
    end
  );

  return query
  select
    public.tenant_billing_access_allowed(row_tenant_id) as access_allowed,
    latest_sub.status::text as billing_status,
    computed_grace as grace_until,
    latest_sub.current_period_end as current_period_end,
    latest_sub.id as subscription_id;
end;
$$;

create or replace function public.tenant_access_allowed(row_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    case
      when not public.is_tenant_enforcement_enabled() then true
      else
        row_tenant_id is not null
        and row_tenant_id = public.current_tenant_id()
        and public.tenant_billing_access_allowed(row_tenant_id)
    end;
$$;

create or replace function public.tenant_write_allowed(row_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    case
      when not public.is_tenant_enforcement_enabled() then true
      else
        row_tenant_id is not null
        and row_tenant_id = public.current_tenant_id()
        and public.tenant_billing_access_allowed(row_tenant_id)
    end;
$$;

commit;
