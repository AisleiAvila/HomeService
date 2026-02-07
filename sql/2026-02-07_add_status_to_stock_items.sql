-- Adiciona campo de status aos itens de estoque
-- Fluxo:
--   Recebido -> Distribuído -> (Retirado) -> (Instalado)
--   Distribuído/Retirado -> (Devolvido)

ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS status text;

-- Backfill para registros existentes
UPDATE public.stock_items
SET status = 'Recebido'
WHERE status IS NULL;

-- Default + NOT NULL
ALTER TABLE public.stock_items
  ALTER COLUMN status SET DEFAULT 'Recebido';

ALTER TABLE public.stock_items
  ALTER COLUMN status SET NOT NULL;

-- Validação dos valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stock_items_status_check'
  ) THEN
    ALTER TABLE public.stock_items
      ADD CONSTRAINT stock_items_status_check
      CHECK (status IN ('Recebido', 'Distribuído', 'Retirado', 'Instalado', 'Devolvido'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS stock_items_status_idx
  ON public.stock_items (status);
