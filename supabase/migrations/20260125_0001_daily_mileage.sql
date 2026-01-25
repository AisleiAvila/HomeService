-- Create daily mileage and fueling tables for professional mileage tracking

begin;

-- Create daily_mileages table
create table if not exists public.daily_mileages (
  id bigserial primary key,
  professional_id bigint not null references public.users(id) on delete cascade,
  date date not null,
  start_kilometers integer not null check (start_kilometers >= 0),
  end_kilometers integer check (end_kilometers >= start_kilometers),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(professional_id, date)
);

-- Create fuelings table
create table if not exists public.fuelings (
  id bigserial primary key,
  daily_mileage_id bigint not null references public.daily_mileages(id) on delete cascade,
  value decimal(10,2) not null check (value > 0),
  receipt_image_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS (Row Level Security) - Access control will be handled by application logic
alter table public.daily_mileages enable row level security;
alter table public.fuelings enable row level security;

-- RLS policies - Allow all operations (access control handled by application)
create policy "Allow all operations on daily_mileages" on public.daily_mileages
  for all using (true);

create policy "Allow all operations on fuelings" on public.fuelings
  for all using (true);

-- Create indexes for performance
create index if not exists idx_daily_mileages_professional_date on public.daily_mileages(professional_id, date);
create index if not exists idx_fuelings_daily_mileage on public.fuelings(daily_mileage_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at on daily_mileages
create trigger handle_daily_mileages_updated_at
  before update on public.daily_mileages
  for each row execute procedure public.handle_updated_at();

commit;