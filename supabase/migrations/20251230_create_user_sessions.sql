-- Creates server-side sessions for custom auth (opaque token + expiry)

create extension if not exists pgcrypto;

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  revoked_reason text null,
  last_seen_at timestamptz null,
  user_agent text null,
  ip inet null
);

create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists user_sessions_expires_at_idx on public.user_sessions(expires_at);

alter table public.user_sessions enable row level security;
