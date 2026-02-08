-- Atualiza a constraint de role na tabela public.users para aceitar as novas roles.
-- Erro observado: new row for relation "users" violates check constraint "users_role_check"

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IN (
      'client',
      'professional',
      'admin',
      'almoxarife',
      'secretario',
      'professional_almoxarife'
    )
  );
