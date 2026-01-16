-- Timezone fix for service scheduling
--
-- Context:
-- - Current columns in public.service_requests are `timestamp without time zone`.
-- - Business rule: user/admin always types time in the service location timezone (derived from zip_code).
-- - We standardize instants in UTC by migrating to `timestamptz` and storing `service_time_zone` (IANA).
--
-- IMPORTANT:
-- This script assumes existing values represent Europe/Lisbon local clock time.
-- User confirmed there are currently no Azores (Atlantic/Azores) requests in production.

begin;

alter table public.service_requests
  add column if not exists service_time_zone text not null default 'Europe/Lisbon';

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
-- Using AT TIME ZONE interprets the old timestamp as Europe/Lisbon local time,
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
      using requested_datetime at time zone 'Europe/Lisbon';
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
      using scheduled_start_datetime at time zone 'Europe/Lisbon';
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
      using started_at at time zone 'Europe/Lisbon';
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
      using finalized_at at time zone 'Europe/Lisbon';
  end if;
end $$;

commit;
