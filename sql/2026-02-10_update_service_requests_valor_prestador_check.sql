DO $$
DECLARE
  constraint_rec record;
BEGIN
  FOR constraint_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.service_requests'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%valor_prestador%'
        OR pg_get_constraintdef(oid) ILIKE '%valor%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
  END LOOP;

  ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_valor_prestador_check
    CHECK (valor_prestador >= 0);

  ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_valor_check
    CHECK (valor >= 0);
END $$;
