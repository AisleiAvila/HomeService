-- Adds logical deletion support for service requests
-- When deleted_at is NOT NULL, the request is considered logically deleted.

alter table if exists public.service_requests
  add column if not exists deleted_at timestamptz null;

create index if not exists service_requests_deleted_at_idx
  on public.service_requests (deleted_at);
