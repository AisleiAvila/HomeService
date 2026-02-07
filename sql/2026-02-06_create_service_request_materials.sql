-- Vincula materiais (stock_items) às solicitações (service_requests)

CREATE TABLE IF NOT EXISTS public.service_request_materials (
  id bigserial PRIMARY KEY,
  service_request_id bigint NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  stock_item_id bigint NOT NULL REFERENCES public.stock_items(id),
  quantity_used integer NOT NULL DEFAULT 1,
  notes text,
  created_by_admin_id bigint NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_request_materials_unique_idx
  ON public.service_request_materials (service_request_id, stock_item_id);

CREATE INDEX IF NOT EXISTS service_request_materials_request_idx
  ON public.service_request_materials (service_request_id);
