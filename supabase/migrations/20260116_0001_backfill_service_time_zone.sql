-- Backfill service_time_zone for existing rows based on postal code/zip code
--
-- Why: `service_time_zone` is NOT NULL with default 'Europe/Lisbon'.
-- If older/admin-created rows didn't explicitly set it, they will be stored as Lisbon
-- even when the service location postal code is in Azores (95xx-99xx).

begin;

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

commit;
