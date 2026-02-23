-- Fix role check constraint to allow super_user
-- Run this if promoting a user to super_user fails with users_role_check violation.

begin;

alter table public.users
  drop constraint if exists users_role_check;

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
