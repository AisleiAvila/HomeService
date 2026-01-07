-- Adds OTP-based multi-party signature workflow for technical reports

create extension if not exists pgcrypto;

alter table if exists public.technical_reports
  add column if not exists status text not null default 'generated',
  add column if not exists latest_file_url text null,
  add column if not exists latest_storage_path text null,
  add column if not exists professional_signed_at timestamptz null,
  add column if not exists client_signed_at timestamptz null,
  add column if not exists client_sign_token uuid null;

create index if not exists technical_reports_client_sign_token_idx
  on public.technical_reports(client_sign_token);

-- One row per signer (professional/client) per report
create table if not exists public.technical_report_signatures (
  id bigserial primary key,
  technical_report_id bigint not null references public.technical_reports(id) on delete cascade,
  signer_type text not null check (signer_type in ('professional','client')),
  signer_email text not null,

  otp_hash text null,
  otp_expires_at timestamptz null,
  otp_verified_at timestamptz null,
  otp_attempts int not null default 0,
  otp_locked_at timestamptz null,

  signature_image_data_url text null,

  signed_storage_path text null,
  signed_file_url text null,
  signed_at timestamptz null,

  created_at timestamptz not null default now(),

  unique (technical_report_id, signer_type)
);

create index if not exists technical_report_signatures_report_idx
  on public.technical_report_signatures(technical_report_id);
