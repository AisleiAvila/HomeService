-- Vincula item de estoque a uma solicitacao de servico

ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS service_request_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stock_items_service_request_id_fkey'
  ) THEN
    ALTER TABLE public.stock_items
      ADD CONSTRAINT stock_items_service_request_id_fkey
      FOREIGN KEY (service_request_id)
      REFERENCES public.service_requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS stock_items_service_request_id_idx
  ON public.stock_items (service_request_id);
