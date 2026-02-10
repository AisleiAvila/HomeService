CREATE TABLE IF NOT EXISTS public.service_request_value_history (
  id bigserial PRIMARY KEY,
  service_request_id bigint NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  changed_by_user_id bigint NOT NULL REFERENCES public.users(id),
  valor_before numeric(12, 2) NOT NULL DEFAULT 0,
  valor_after numeric(12, 2) NOT NULL DEFAULT 0,
  valor_prestador_before numeric(12, 2) NOT NULL DEFAULT 0,
  valor_prestador_after numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_value_history_valor_before_check CHECK (valor_before >= 0),
  CONSTRAINT service_request_value_history_valor_after_check CHECK (valor_after >= 0),
  CONSTRAINT service_request_value_history_valor_prestador_before_check CHECK (valor_prestador_before >= 0),
  CONSTRAINT service_request_value_history_valor_prestador_after_check CHECK (valor_prestador_after >= 0)
);

CREATE INDEX IF NOT EXISTS service_request_value_history_request_idx
  ON public.service_request_value_history (service_request_id);

CREATE INDEX IF NOT EXISTS service_request_value_history_user_idx
  ON public.service_request_value_history (changed_by_user_id);

CREATE INDEX IF NOT EXISTS service_request_value_history_created_at_idx
  ON public.service_request_value_history (created_at);
