-- Stores generated technical reports metadata + form data
-- Also provisions a dedicated Storage bucket used by the app.

create extension if not exists pgcrypto;

-- Table to persist submitted form data and the generated PDF location
create table if not exists public.technical_reports (
  id bigserial primary key,
  service_request_id bigint not null references public.service_requests(id) on delete cascade,
  origin_id bigint null references public.service_request_origins(id) on delete set null,
  origin_key text not null,
  report_data jsonb not null,
  generated_by bigint not null references public.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  storage_bucket text not null default 'technical-reports',
  storage_path text not null,
  file_url text not null,
  file_name text not null,
  file_size bigint null,
  mime_type text null
);

create index if not exists technical_reports_service_request_id_idx
  on public.technical_reports(service_request_id);

create index if not exists technical_reports_generated_at_idx
  on public.technical_reports(generated_at desc);

-- Provision bucket for report PDFs (public like service-images)
insert into storage.buckets (id, name, public)
values ('technical-reports', 'technical-reports', true)
on conflict (id) do nothing;

-- Storage policies (best-effort; ignore if already exist)
-- NOTE: This project uses custom auth and uploads from the client with the anon key.
-- These policies allow public read and uploads for this specific bucket.
do $$
begin
  create policy "public read technical-reports"
  on storage.objects
  for select
  using (bucket_id = 'technical-reports');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert technical-reports"
  on storage.objects
  for insert
  with check (bucket_id = 'technical-reports');
exception
  when duplicate_object then null;
end $$;

-- Optional: allow delete for cleanup on failed DB insert
-- (kept permissive to match existing client-side upload pattern)
do $$
begin
  create policy "public delete technical-reports"
  on storage.objects
  for delete
  using (bucket_id = 'technical-reports');
exception
  when duplicate_object then null;
end $$;
