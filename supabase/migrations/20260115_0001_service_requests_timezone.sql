-- Timezone fix for service scheduling
--
-- Context:
-- - Current columns in public.service_requests are `timestamp without time zone`.
-- - Business rule: user/admin always types time in the service location timezone (derived from zip_code).
-- - We standardize instants in UTC by migrating to `timestamptz` and storing `service_time_zone` (IANA).
--
-- IMPORTANT:
-- Existing values were historically stored as local clock time (no timezone).
-- We backfill `service_time_zone` from zip/postal code (95xx-99xx => Azores) and then convert
-- each datetime column using the per-row `service_time_zone`.

begin;

alter table public.service_requests
  add column if not exists service_time_zone text not null default 'Europe/Lisbon';

-- Ensure column is NOT NULL + default even if it already existed.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'service_time_zone'
  ) then
    alter table public.service_requests
      alter column service_time_zone set default 'Europe/Lisbon';

    update public.service_requests
    set service_time_zone = 'Europe/Lisbon'
    where service_time_zone is null;

    alter table public.service_requests
      alter column service_time_zone set not null;
  end if;
end $$;

-- Backfill service_time_zone for existing rows based on postal code/zip code.
-- Azores are typically 95xx-99xx. Madeira (90xx) remains Europe/Lisbon.
do $$
declare
  zip_expr text;
  sql text;
begin
  -- Determine which column to use (schema differs across older/newer rows)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'zip_code'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'postal_code'
  ) then
    zip_expr := 'coalesce(zip_code, postal_code)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'zip_code'
  ) then
    zip_expr := 'zip_code';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'postal_code'
  ) then
    zip_expr := 'postal_code';
  else
    zip_expr := null;
  end if;

  if zip_expr is not null then
    sql := format($f$
      update public.service_requests
      set service_time_zone = 'Atlantic/Azores'
      where service_time_zone <> 'Atlantic/Azores'
        and left(regexp_replace(%s, '[^0-9]', '', 'g'), 2) between '95' and '99';
    $f$, zip_expr);

    execute sql;
  end if;
end $$;

-- Optional: constrain allowed values
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_service_time_zone_allowed'
  ) then
    alter table public.service_requests
      add constraint service_requests_service_time_zone_allowed
      check (service_time_zone in ('Europe/Lisbon', 'Atlantic/Azores'));
  end if;
end $$;

-- Convert key datetime fields from timestamp -> timestamptz.
-- Using AT TIME ZONE interprets the old timestamp as per-row local time zone,
-- producing the correct UTC instant.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'requested_datetime'
      and data_type = 'timestamp without time zone'
  ) then
    alter table public.service_requests
      alter column requested_datetime
      type timestamptz
      using requested_datetime at time zone service_time_zone;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'scheduled_start_datetime'
      and data_type = 'timestamp without time zone'
  ) then
    alter table public.service_requests
      alter column scheduled_start_datetime
      type timestamptz
      using scheduled_start_datetime at time zone service_time_zone;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'started_at'
      and data_type = 'timestamp without time zone'
  ) then
    alter table public.service_requests
      alter column started_at
      type timestamptz
      using started_at at time zone service_time_zone;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'finalized_at'
      and data_type = 'timestamp without time zone'
  ) then
    alter table public.service_requests
      alter column finalized_at
      type timestamptz
      using finalized_at at time zone service_time_zone;
  end if;
end $$;

commit;
