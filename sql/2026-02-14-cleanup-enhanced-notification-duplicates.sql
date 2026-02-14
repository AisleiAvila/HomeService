-- Remove duplicate daily notifications before applying unique index.
-- Keeps the most recent notification per user/type/service_request_id/day.

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, type, coalesce(service_request_id, 0), created_at::date
      order by created_at desc, id desc
    ) as rn
  from public.enhanced_notifications
  where type in ('deadline_warning', 'overdue_alert')
)
delete from public.enhanced_notifications
where id in (
  select id
  from ranked
  where rn > 1
);
