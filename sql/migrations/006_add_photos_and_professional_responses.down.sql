-- Migration DOWN: Remove suporte para fotos, anexos e respostas de profissionais
-- Execute este script no SQL Editor do Supabase para reverter as mudanças

BEGIN;

-- 1. Remover trigger
DROP TRIGGER IF EXISTS trigger_update_professional_responses_updated_at ON public.professional_responses;
DROP FUNCTION IF EXISTS update_professional_responses_updated_at();

-- 2. Remover tabela professional_responses (sem políticas RLS para remover)
DROP TABLE IF EXISTS public.professional_responses;

-- 3. Remover colunas de fotos e anexos da tabela service_requests
ALTER TABLE public.service_requests
DROP COLUMN IF EXISTS photos,
DROP COLUMN IF EXISTS attachments;

COMMIT;
