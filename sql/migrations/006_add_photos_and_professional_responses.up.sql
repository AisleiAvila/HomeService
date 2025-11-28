-- Migration UP: Adiciona suporte para fotos, anexos e respostas de profissionais
-- Execute este script no SQL Editor do Supabase

BEGIN;

-- 1. Adicionar campos de fotos e anexos à tabela service_requests
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS photos TEXT[], -- Array de URLs de fotos
ADD COLUMN IF NOT EXISTS attachments TEXT[]; -- Array de URLs de anexos/documentos

-- 2. Criar tabela para respostas de profissionais (professional_responses)
CREATE TABLE IF NOT EXISTS public.professional_responses (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quote_amount NUMERIC(10, 2), -- Valor do orçamento
  quote_notes TEXT, -- Observações sobre o orçamento
  estimated_duration_hours NUMERIC(5, 2), -- Duração estimada em horas
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'accepted', 'rejected')),
  responded_at TIMESTAMP WITH TIME ZONE, -- Quando o profissional respondeu
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar respostas duplicadas do mesmo profissional para o mesmo pedido
  UNIQUE(service_request_id, professional_id)
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_professional_responses_request 
ON public.professional_responses(service_request_id);

CREATE INDEX IF NOT EXISTS idx_professional_responses_professional 
ON public.professional_responses(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_responses_status 
ON public.professional_responses(response_status);

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN public.service_requests.photos IS 'Array de URLs de fotos anexadas ao pedido de serviço';
COMMENT ON COLUMN public.service_requests.attachments IS 'Array de URLs de documentos/anexos relacionados ao pedido';
COMMENT ON TABLE public.professional_responses IS 'Respostas e orçamentos de profissionais para pedidos de serviço';
COMMENT ON COLUMN public.professional_responses.quote_amount IS 'Valor do orçamento apresentado pelo profissional';
COMMENT ON COLUMN public.professional_responses.response_status IS 'Status da resposta: pending, responded, accepted, rejected';

-- 5. Desabilitar RLS (Row Level Security) na nova tabela
-- Como a aplicação não usa Supabase Auth, o RLS não é necessário
-- O controle de acesso será feito na camada da aplicação
ALTER TABLE public.professional_responses DISABLE ROW LEVEL SECURITY;

-- 6. Conceder permissões para roles padrão do Supabase
GRANT ALL ON public.professional_responses TO postgres;
GRANT ALL ON public.professional_responses TO anon;
GRANT ALL ON public.professional_responses TO authenticated;
GRANT ALL ON public.professional_responses TO service_role;

-- Conceder permissões na sequence
GRANT USAGE, SELECT ON SEQUENCE professional_responses_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE professional_responses_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE professional_responses_id_seq TO service_role;

-- 7. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_professional_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_responses_updated_at
BEFORE UPDATE ON public.professional_responses
FOR EACH ROW
EXECUTE FUNCTION update_professional_responses_updated_at();

COMMIT;
