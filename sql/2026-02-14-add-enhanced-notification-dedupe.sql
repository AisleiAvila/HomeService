-- Add a daily dedupe key for deadline/overdue notifications.
-- Note: if duplicates already exist, the unique index will fail.

alter table if exists public.enhanced_notifications
  add column if not exists dedupe_date date;

update public.enhanced_notifications
set dedupe_date = created_at::date
where dedupe_date is null;

create unique index if not exists enhanced_notifications_daily_dedupe
  on public.enhanced_notifications (
    user_id,
    type,
    coalesce(service_request_id, 0),
    dedupe_date
  )
  where type in ('deadline_warning', 'overdue_alert');
