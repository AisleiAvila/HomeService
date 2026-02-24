-- Fix RPC mark_service_request_daily_alert_sent type mismatch
-- Handles both legacy jsonb and current text[] representations of deadline_alerts_sent.

begin;

create or replace function public.mark_service_request_daily_alert_sent(
  request_id bigint,
  alert_type text
)
returns boolean
language plpgsql
security invoker
as $$
declare
  today_key text;
  rows_updated integer := 0;
  column_udt_name text;
begin
  if request_id is null or alert_type is null or btrim(alert_type) = '' then
    return false;
  end if;

  today_key := alert_type || '_' || to_char(current_date, 'YYYY-MM-DD');

  select c.udt_name
    into column_udt_name
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name = 'service_requests'
     and c.column_name = 'deadline_alerts_sent'
   limit 1;

  if column_udt_name is null then
    return false;
  end if;

  if column_udt_name = '_text' then
    update public.service_requests sr
       set deadline_alerts_sent = array_append(coalesce(sr.deadline_alerts_sent, '{}'::text[]), today_key)
     where sr.id = request_id
       and sr.deleted_at is null
       and not (today_key = any(coalesce(sr.deadline_alerts_sent, '{}'::text[])));

    get diagnostics rows_updated = row_count;
    return rows_updated > 0;
  end if;

  if column_udt_name = 'jsonb' then
    update public.service_requests sr
       set deadline_alerts_sent =
         case
           when sr.deadline_alerts_sent is null then to_jsonb(array[today_key]::text[])
           else sr.deadline_alerts_sent || to_jsonb(array[today_key]::text[])
         end
     where sr.id = request_id
       and sr.deleted_at is null
       and not (coalesce(sr.deadline_alerts_sent, '[]'::jsonb) ? today_key);

    get diagnostics rows_updated = row_count;
    return rows_updated > 0;
  end if;

  return false;
end;
$$;

commit;
