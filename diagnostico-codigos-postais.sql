-- Script de diagnóstico para verificar códigos postais existentes
-- Execute ANTES do script principal para ver o que precisa ser corrigido
-- 
-- NOVO: Este script agora suporta validação via API https://www.codigo-postal.pt/ws/v1/ptcp/search/
-- As validações offline continuam funcionando como fallback

-- 1. Verificar códigos postais inválidos em service_requests
SELECT 
  id,
  title,
  zip_code,
  CASE 
    WHEN zip_code IS NULL THEN 'NULL'
    WHEN zip_code ~ '^\d{4}-\d{3}$' THEN 'VÁLIDO (formato)'
    WHEN regexp_replace(zip_code, '[^0-9]', '', 'g') ~ '^\d{7}$' THEN 'PODE SER CORRIGIDO'
    ELSE 'INVÁLIDO'
  END as status_postal_code,
  -- Novo: Indicar se precisa validação via API
  CASE 
    WHEN zip_code ~ '^\d{4}-\d{3}$' THEN 'VALIDAR VIA API'
    ELSE 'NÃO PRECISA API'
  END as necessita_validacao_api
FROM service_requests
WHERE zip_code IS NOT NULL
ORDER BY 
  CASE 
    WHEN zip_code ~ '^\d{4}-\d{3}$' THEN 1
    WHEN regexp_replace(zip_code, '[^0-9]', '', 'g') ~ '^\d{7}$' THEN 2
    ELSE 3
  END;

-- 2. Contar tipos de códigos postais
SELECT 
  CASE 
    WHEN zip_code IS NULL THEN 'NULL'
    WHEN zip_code ~ '^\d{4}-\d{3}$' THEN 'VÁLIDO (XXXX-XXX)'
    WHEN regexp_replace(zip_code, '[^0-9]', '', 'g') ~ '^\d{7}$' THEN 'PODE SER CORRIGIDO'
    ELSE 'INVÁLIDO'
  END as categoria,
  COUNT(*) as quantidade
FROM service_requests
GROUP BY 
  CASE 
    WHEN zip_code IS NULL THEN 'NULL'
    WHEN zip_code ~ '^\d{4}-\d{3}$' THEN 'VÁLIDO (XXXX-XXX)'
    WHEN regexp_replace(zip_code, '[^0-9]', '', 'g') ~ '^\d{7}$' THEN 'PODE SER CORRIGIDO'
    ELSE 'INVÁLIDO'
  END
ORDER BY quantidade DESC;

-- 3. Mostrar exemplos de códigos que serão corrigidos
SELECT 
  zip_code as codigo_original,
  regexp_replace(zip_code, '[^0-9]', '', 'g') as apenas_numeros,
  CASE 
    WHEN length(regexp_replace(zip_code, '[^0-9]', '', 'g')) = 7 THEN
      substring(regexp_replace(zip_code, '[^0-9]', '', 'g') from 1 for 4) || '-' || 
      substring(regexp_replace(zip_code, '[^0-9]', '', 'g') from 5 for 3)
    ELSE 'NÃO PODE SER CORRIGIDO'
  END as codigo_corrigido
FROM service_requests
WHERE zip_code IS NOT NULL
AND NOT (zip_code ~ '^\d{4}-\d{3}$')
LIMIT 10;

-- 4. Verificar se existem constraints que podem causar problemas
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'service_requests'::regclass
AND conname LIKE '%postal%' OR conname LIKE '%zip%';

-- 5. Verificar usuários com códigos postais inválidos
SELECT 
  id,
  email,
  address_zip_code,
  CASE 
    WHEN address_zip_code IS NULL THEN 'NULL'
    WHEN address_zip_code ~ '^\d{4}-\d{3}$' THEN 'VÁLIDO'
    WHEN regexp_replace(address_zip_code, '[^0-9]', '', 'g') ~ '^\d{7}$' THEN 'PODE SER CORRIGIDO'
    ELSE 'INVÁLIDO'
  END as status_postal_code
FROM users
WHERE address_zip_code IS NOT NULL;

-- INSTRUÇÕES:
-- 1. Execute este script primeiro para ver o estado atual
-- 2. Códigos com formato válido (XXXX-XXX) serão validados via API no frontend
-- 3. Se houver códigos inválidos, o script principal irá corrigi-los automaticamente
-- 4. Códigos com exatamente 7 dígitos serão formatados para XXXX-XXX
-- 5. Códigos que não podem ser corrigidos serão definidos como NULL

-- NOVO: VALIDAÇÃO VIA API
-- Para códigos com formato válido, use o novo serviço Angular:
-- 
-- import { PostalCodeApiService } from './services/postal-code-api.service';
-- 
-- validatePostalCode(code: string) {
--   this.postalCodeApi.validatePostalCode(code).subscribe(result => {
--     if (result.isValid) {
--       console.log('✅ Código válido na API:', result.locality, result.district);
--     } else {
--       console.log('❌ Código não encontrado na API:', result.error);
--     }
--   });
-- }

-- 6. Lista de códigos postais para teste da API:
SELECT 'CÓDIGOS PARA TESTE DA API' as info;
SELECT '1000-001' as codigo_postal, 'Lisboa (deve ser válido)' as descricao
UNION ALL SELECT '4000-001', 'Porto (deve ser válido)'
UNION ALL SELECT '3000-001', 'Coimbra (deve ser válido)'
UNION ALL SELECT '1100-048', 'Rua Augusta, Lisboa (deve ser válido)'
UNION ALL SELECT '9999-999', 'Código inexistente (deve ser inválido)';

-- 7. Query para exportar códigos postais únicos para validação em lote
SELECT DISTINCT 
  zip_code,
  COUNT(*) as qtd_registros
FROM service_requests 
WHERE zip_code ~ '^\d{4}-\d{3}$'
GROUP BY zip_code
ORDER BY qtd_registros DESC
LIMIT 20; -- Top 20 códigos mais usados para teste prioritário
