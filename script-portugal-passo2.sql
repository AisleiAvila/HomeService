-- =====================================
-- PASSO 3: Corrigir dados existentes
-- =====================================

-- 3.1. Verificar e mostrar códigos postais que precisam correção
SELECT 
  'service_requests' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN zip_code IS NOT NULL AND NOT validate_portuguese_postal_code(zip_code) THEN 1 END) as codigos_invalidos
FROM service_requests
UNION ALL
SELECT 
  'users' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN address_zip_code IS NOT NULL AND NOT validate_portuguese_postal_code(address_zip_code) THEN 1 END) as codigos_invalidos
FROM users;

-- 3.2. Mostrar exemplos de códigos que serão corrigidos
SELECT 
  id,
  zip_code as codigo_original,
  format_portuguese_postal_code(zip_code) as codigo_corrigido
FROM service_requests
WHERE zip_code IS NOT NULL 
AND NOT validate_portuguese_postal_code(zip_code)
LIMIT 5;

-- 3.3. Corrigir códigos postais em service_requests
UPDATE service_requests 
SET zip_code = format_portuguese_postal_code(zip_code)
WHERE zip_code IS NOT NULL 
AND NOT validate_portuguese_postal_code(zip_code)
AND format_portuguese_postal_code(zip_code) IS NOT NULL;

-- 3.4. Definir NULL para códigos que não podem ser corrigidos
UPDATE service_requests 
SET zip_code = NULL
WHERE zip_code IS NOT NULL 
AND NOT validate_portuguese_postal_code(zip_code);

-- 3.5. Corrigir códigos postais em users (se existirem)
UPDATE users 
SET address_zip_code = format_portuguese_postal_code(address_zip_code)
WHERE address_zip_code IS NOT NULL 
AND NOT validate_portuguese_postal_code(address_zip_code)
AND format_portuguese_postal_code(address_zip_code) IS NOT NULL;

-- 3.6. Definir NULL para códigos de usuários que não podem ser corrigidos
UPDATE users 
SET address_zip_code = NULL
WHERE address_zip_code IS NOT NULL 
AND NOT validate_portuguese_postal_code(address_zip_code);

-- 3.7. Verificar se correção funcionou
SELECT 
  'Após correção - service_requests' as status,
  COUNT(*) as total,
  COUNT(CASE WHEN zip_code IS NOT NULL AND NOT validate_portuguese_postal_code(zip_code) THEN 1 END) as ainda_invalidos
FROM service_requests
UNION ALL
SELECT 
  'Após correção - users' as status,
  COUNT(*) as total,
  COUNT(CASE WHEN address_zip_code IS NOT NULL AND NOT validate_portuguese_postal_code(address_zip_code) THEN 1 END) as ainda_invalidos
FROM users;
