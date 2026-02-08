-- Relação usuário <-> armazém (escopo de acesso ao módulo Estoque)
-- Observação: a associação é independente do papel (role) do usuário.

CREATE TABLE IF NOT EXISTS public.user_warehouses (
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  warehouse_id integer NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS user_warehouses_user_id_idx
  ON public.user_warehouses (user_id);

CREATE INDEX IF NOT EXISTS user_warehouses_warehouse_id_idx
  ON public.user_warehouses (warehouse_id);
