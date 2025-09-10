-- ================================================================
-- MIGRAÇÃO: Adição de suporte à validação via API de códigos postais
-- Data: Setembro 2025
-- Descrição: Cria tabelas para log de validações via API e métricas
-- ================================================================

-- 1. Criar tabela para logs de validação da API
CREATE TABLE IF NOT EXISTS postal_code_validation_logs (
    id SERIAL PRIMARY KEY,
    postal_code VARCHAR(8) NOT NULL,
    api_response_status VARCHAR(20) NOT NULL, -- 'success', 'not_found', 'api_error', 'timeout'
    api_response_time_ms INTEGER,
    is_valid BOOLEAN NOT NULL,
    locality VARCHAR(100),
    district VARCHAR(100),
    municipality VARCHAR(100),
    street_name VARCHAR(200),
    error_message TEXT,
    user_id UUID REFERENCES users(id),
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_postal_validation_logs_postal_code ON postal_code_validation_logs(postal_code);
CREATE INDEX IF NOT EXISTS idx_postal_validation_logs_created_at ON postal_code_validation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_postal_validation_logs_api_status ON postal_code_validation_logs(api_response_status);
CREATE INDEX IF NOT EXISTS idx_postal_validation_logs_user_id ON postal_code_validation_logs(user_id);

-- 3. Criar tabela para cache de códigos postais válidos
CREATE TABLE IF NOT EXISTS postal_codes_cache (
    postal_code VARCHAR(8) PRIMARY KEY,
    locality VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    street_name VARCHAR(200),
    is_verified BOOLEAN DEFAULT TRUE,
    verification_source VARCHAR(50) DEFAULT 'api', -- 'api', 'manual', 'import'
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Inserir códigos postais conhecidos como válidos (dados de exemplo)
INSERT INTO postal_codes_cache (postal_code, locality, district, municipality, verification_source) VALUES
('1000-001', 'Lisboa', 'Lisboa', 'Lisboa', 'manual'),
('1100-048', 'Lisboa', 'Lisboa', 'Lisboa', 'manual'),
('4000-001', 'Porto', 'Porto', 'Porto', 'manual'),
('4000-066', 'Porto', 'Porto', 'Porto', 'manual'),
('3000-001', 'Coimbra', 'Coimbra', 'Coimbra', 'manual'),
('2000-001', 'Santarém', 'Santarém', 'Santarém', 'manual'),
('8000-001', 'Faro', 'Faro', 'Faro', 'manual')
ON CONFLICT (postal_code) DO NOTHING;

-- 5. Criar função para log de validação
CREATE OR REPLACE FUNCTION log_postal_code_validation(
    p_postal_code VARCHAR(8),
    p_api_status VARCHAR(20),
    p_response_time INTEGER DEFAULT NULL,
    p_is_valid BOOLEAN DEFAULT FALSE,
    p_locality VARCHAR(100) DEFAULT NULL,
    p_district VARCHAR(100) DEFAULT NULL,
    p_municipality VARCHAR(100) DEFAULT NULL,
    p_street_name VARCHAR(200) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_client_ip VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO postal_code_validation_logs (
        postal_code, api_response_status, api_response_time_ms, is_valid,
        locality, district, municipality, street_name, error_message,
        user_id, client_ip, user_agent
    ) VALUES (
        p_postal_code, p_api_status, p_response_time, p_is_valid,
        p_locality, p_district, p_municipality, p_street_name, p_error_message,
        p_user_id, p_client_ip, p_user_agent
    ) RETURNING id INTO log_id;
    
    -- Se a validação foi bem-sucedida, atualizar ou inserir no cache
    IF p_is_valid AND p_api_status = 'success' THEN
        INSERT INTO postal_codes_cache (
            postal_code, locality, district, municipality, street_name, 
            verification_source, verification_count
        ) VALUES (
            p_postal_code, p_locality, p_district, p_municipality, p_street_name,
            'api', 1
        ) ON CONFLICT (postal_code) DO UPDATE SET
            locality = EXCLUDED.locality,
            district = EXCLUDED.district,
            municipality = EXCLUDED.municipality,
            street_name = COALESCE(EXCLUDED.street_name, postal_codes_cache.street_name),
            last_verified_at = NOW(),
            verification_count = postal_codes_cache.verification_count + 1,
            updated_at = NOW();
    END IF;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para buscar código postal no cache
CREATE OR REPLACE FUNCTION get_cached_postal_code(p_postal_code VARCHAR(8))
RETURNS TABLE(
    postal_code VARCHAR(8),
    locality VARCHAR(100),
    district VARCHAR(100),
    municipality VARCHAR(100),
    street_name VARCHAR(200),
    last_verified_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.postal_code,
        pc.locality,
        pc.district,
        pc.municipality,
        pc.street_name,
        pc.last_verified_at
    FROM postal_codes_cache pc
    WHERE pc.postal_code = p_postal_code
    AND pc.is_verified = TRUE
    AND pc.last_verified_at > NOW() - INTERVAL '30 days'; -- Cache válido por 30 dias
END;
$$ LANGUAGE plpgsql;

-- 7. Criar view para estatísticas de validação
CREATE OR REPLACE VIEW postal_validation_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as validation_date,
    api_response_status,
    COUNT(*) as total_validations,
    COUNT(CASE WHEN is_valid THEN 1 END) as valid_codes,
    COUNT(CASE WHEN NOT is_valid THEN 1 END) as invalid_codes,
    ROUND(AVG(api_response_time_ms), 2) as avg_response_time_ms,
    COUNT(DISTINCT postal_code) as unique_codes_tested,
    COUNT(DISTINCT user_id) as unique_users
FROM postal_code_validation_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), api_response_status
ORDER BY validation_date DESC, api_response_status;

-- 8. Criar view para códigos postais mais utilizados
CREATE OR REPLACE VIEW popular_postal_codes AS
SELECT 
    sr.zip_code as postal_code,
    COUNT(*) as usage_count,
    pc.locality,
    pc.district,
    pc.municipality,
    pc.is_verified,
    pc.last_verified_at,
    CASE 
        WHEN pc.postal_code IS NOT NULL THEN 'cached'
        WHEN sr.zip_code ~ '^\d{4}-\d{3}$' THEN 'needs_validation'
        ELSE 'invalid_format'
    END as validation_status
FROM service_requests sr
LEFT JOIN postal_codes_cache pc ON sr.zip_code = pc.postal_code
WHERE sr.zip_code IS NOT NULL
GROUP BY sr.zip_code, pc.locality, pc.district, pc.municipality, pc.is_verified, pc.last_verified_at, pc.postal_code
ORDER BY usage_count DESC;

-- 9. Comentários para documentação
COMMENT ON TABLE postal_code_validation_logs IS 'Log de todas as validações de códigos postais via API';
COMMENT ON TABLE postal_codes_cache IS 'Cache de códigos postais validados para melhorar performance';
COMMENT ON FUNCTION log_postal_code_validation IS 'Registra resultado de validação via API e atualiza cache';
COMMENT ON FUNCTION get_cached_postal_code IS 'Busca código postal no cache local (válido por 30 dias)';
COMMENT ON VIEW postal_validation_stats IS 'Estatísticas diárias de validação via API';
COMMENT ON VIEW popular_postal_codes IS 'Códigos postais mais utilizados no sistema';

-- 10. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_postal_codes_cache_updated_at
    BEFORE UPDATE ON postal_codes_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_postal_validation_logs_updated_at
    BEFORE UPDATE ON postal_code_validation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Exemplo de queries úteis
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabelas criadas:';
    RAISE NOTICE '- postal_code_validation_logs';
    RAISE NOTICE '- postal_codes_cache';
    RAISE NOTICE '';
    RAISE NOTICE 'Views criadas:';
    RAISE NOTICE '- postal_validation_stats';
    RAISE NOTICE '- popular_postal_codes';
    RAISE NOTICE '';
    RAISE NOTICE 'Funções criadas:';
    RAISE NOTICE '- log_postal_code_validation()';
    RAISE NOTICE '- get_cached_postal_code()';
    RAISE NOTICE '';
    RAISE NOTICE 'Exemplos de uso:';
    RAISE NOTICE '';
    RAISE NOTICE '-- Ver estatísticas dos últimos 7 dias:';
    RAISE NOTICE 'SELECT * FROM postal_validation_stats WHERE validation_date >= NOW() - INTERVAL ''7 days'';';
    RAISE NOTICE '';
    RAISE NOTICE '-- Ver códigos mais utilizados:';
    RAISE NOTICE 'SELECT * FROM popular_postal_codes LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '-- Buscar código no cache:';
    RAISE NOTICE 'SELECT * FROM get_cached_postal_code(''1000-001'');';
    RAISE NOTICE '';
    RAISE NOTICE '-- Registrar validação (exemplo para usar no backend):';
    RAISE NOTICE 'SELECT log_postal_code_validation(''1000-001'', ''success'', 250, true, ''Lisboa'', ''Lisboa'', ''Lisboa'');';
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
END $$;
