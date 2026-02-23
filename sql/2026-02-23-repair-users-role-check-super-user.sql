-- Repair users.role CHECK constraint to include super_user
-- Use when UPDATE role='super_user' fails with users_role_check violation.

begin;

-- Remove existing named constraint if present
alter table public.users
  drop constraint if exists users_role_check;

-- Recreate with full allowed set used by the application
alter table public.users
  add constraint users_role_check
  check (
    role in (
      'client',
      'professional',
      'admin',
      'super_user',
      'almoxarife',
      'secretario',
      'professional_almoxarife'
    )
  );

commit;

-- Verification
select conname as constraint_name,
       pg_get_constraintdef(c.oid) as constraint_def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'users'
  and c.conname = 'users_role_check';
