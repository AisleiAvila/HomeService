CREATE TABLE IF NOT EXISTS public.stock_items (
  id bigserial PRIMARY KEY,
  barcode text NOT NULL,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  supplier text NOT NULL DEFAULT 'Worten',
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_by_admin_id bigint NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_items_barcode_idx
  ON public.stock_items (barcode);

CREATE INDEX IF NOT EXISTS stock_items_received_at_idx
  ON public.stock_items (received_at DESC);
