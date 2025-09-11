-- =====================================================
-- Funções Úteis para Consultas de Endereços
-- =====================================================

-- Função para buscar códigos postais por código completo
CREATE OR REPLACE FUNCTION buscar_por_codigo_postal(codigo_postal_input TEXT)
RETURNS TABLE (
    codigo_postal VARCHAR(8),
    distrito VARCHAR(100),
    concelho VARCHAR(100),
    localidade VARCHAR(100),
    designacao_postal VARCHAR(100),
    arteria_completa TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    codigo_limpo TEXT;
BEGIN
    -- Limpar e formatar o código postal
    codigo_limpo := REGEXP_REPLACE(codigo_postal_input, '[^0-9]', '', 'g');
    
    IF LENGTH(codigo_limpo) = 7 THEN
        codigo_limpo := SUBSTRING(codigo_limpo, 1, 4) || '-' || SUBSTRING(codigo_limpo, 5, 3);
    END IF;
    
    RETURN QUERY
    SELECT 
        cp.codigo_postal_completo,
        d.nome_distrito,
        c.nome_concelho,
        cp.nome_localidade,
        cp.desig_postal,
        CONCAT_WS(' ', 
            cp.tipo_arteria,
            cp.prep1,
            cp.titulo_arteria, 
            cp.prep2,
            cp.nome_arteria,
            CASE WHEN cp.local_arteria IS NOT NULL THEN '(' || cp.local_arteria || ')' END
        ) as arteria_completa
    FROM codigos_postais cp
    JOIN concelhos c ON cp.cod_distrito = c.cod_distrito AND cp.cod_concelho = c.cod_concelho
    JOIN distritos d ON c.cod_distrito = d.cod_distrito
    WHERE cp.codigo_postal_completo = codigo_limpo
    ORDER BY cp.desig_postal, cp.nome_localidade;
END;
$$;

-- Função para buscar códigos postais por localidade
CREATE OR REPLACE FUNCTION buscar_por_localidade(localidade_input TEXT)
RETURNS TABLE (
    codigo_postal VARCHAR(8),
    distrito VARCHAR(100),
    concelho VARCHAR(100),
    localidade VARCHAR(100),
    designacao_postal VARCHAR(100)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        cp.codigo_postal_completo,
        d.nome_distrito,
        c.nome_concelho,
        cp.nome_localidade,
        cp.desig_postal
    FROM codigos_postais cp
    JOIN concelhos c ON cp.cod_distrito = c.cod_distrito AND cp.cod_concelho = c.cod_concelho
    JOIN distritos d ON c.cod_distrito = d.cod_distrito
    WHERE cp.nome_localidade ILIKE '%' || localidade_input || '%'
       OR cp.desig_postal ILIKE '%' || localidade_input || '%'
    ORDER BY cp.codigo_postal_completo;
END;
$$;

-- Função para buscar por distrito e concelho
CREATE OR REPLACE FUNCTION buscar_por_distrito_concelho(distrito_input TEXT, concelho_input TEXT DEFAULT NULL)
RETURNS TABLE (
    codigo_postal VARCHAR(8),
    distrito VARCHAR(100),
    concelho VARCHAR(100),
    localidade VARCHAR(100),
    designacao_postal VARCHAR(100)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        cp.codigo_postal_completo,
        d.nome_distrito,
        c.nome_concelho,
        cp.nome_localidade,
        cp.desig_postal
    FROM codigos_postais cp
    JOIN concelhos c ON cp.cod_distrito = c.cod_distrito AND cp.cod_concelho = c.cod_concelho
    JOIN distritos d ON c.cod_distrito = d.cod_distrito
    WHERE d.nome_distrito ILIKE '%' || distrito_input || '%'
      AND (concelho_input IS NULL OR c.nome_concelho ILIKE '%' || concelho_input || '%')
    ORDER BY cp.codigo_postal_completo;
END;
$$;

-- Função para validar código postal
CREATE OR REPLACE FUNCTION validar_codigo_postal(codigo_postal_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    codigo_limpo TEXT;
    existe BOOLEAN;
BEGIN
    -- Limpar o código postal
    codigo_limpo := REGEXP_REPLACE(codigo_postal_input, '[^0-9]', '', 'g');
    
    -- Verificar formato
    IF LENGTH(codigo_limpo) != 7 THEN
        RETURN FALSE;
    END IF;
    
    -- Formatar
    codigo_limpo := SUBSTRING(codigo_limpo, 1, 4) || '-' || SUBSTRING(codigo_limpo, 5, 3);
    
    -- Verificar se existe
    SELECT EXISTS(
        SELECT 1 FROM codigos_postais 
        WHERE codigo_postal_completo = codigo_limpo
    ) INTO existe;
    
    RETURN existe;
END;
$$;

-- Função para busca de texto completo em endereços
CREATE OR REPLACE FUNCTION buscar_endereco_texto(texto_busca TEXT)
RETURNS TABLE (
    codigo_postal VARCHAR(8),
    distrito VARCHAR(100),
    concelho VARCHAR(100),
    localidade VARCHAR(100),
    designacao_postal VARCHAR(100),
    arteria_completa TEXT,
    relevancia REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.codigo_postal_completo,
        d.nome_distrito,
        c.nome_concelho,
        cp.nome_localidade,
        cp.desig_postal,
        CONCAT_WS(' ', 
            cp.tipo_arteria,
            cp.prep1,
            cp.titulo_arteria, 
            cp.prep2,
            cp.nome_arteria,
            CASE WHEN cp.local_arteria IS NOT NULL THEN '(' || cp.local_arteria || ')' END
        ) as arteria_completa,
        ts_rank(
            to_tsvector('portuguese', 
                COALESCE(cp.nome_arteria, '') || ' ' ||
                COALESCE(cp.nome_localidade, '') || ' ' ||
                COALESCE(cp.desig_postal, '') || ' ' ||
                COALESCE(c.nome_concelho, '') || ' ' ||
                COALESCE(d.nome_distrito, '')
            ),
            plainto_tsquery('portuguese', texto_busca)
        ) as relevancia
    FROM codigos_postais cp
    JOIN concelhos c ON cp.cod_distrito = c.cod_distrito AND cp.cod_concelho = c.cod_concelho
    JOIN distritos d ON c.cod_distrito = d.cod_distrito
    WHERE to_tsvector('portuguese', 
            COALESCE(cp.nome_arteria, '') || ' ' ||
            COALESCE(cp.nome_localidade, '') || ' ' ||
            COALESCE(cp.desig_postal, '') || ' ' ||
            COALESCE(c.nome_concelho, '') || ' ' ||
            COALESCE(d.nome_distrito, '')
          ) @@ plainto_tsquery('portuguese', texto_busca)
    ORDER BY relevancia DESC, cp.codigo_postal_completo
    LIMIT 50;
END;
$$;

-- View para consultas simplificadas de endereços completos
CREATE OR REPLACE VIEW vw_enderecos_completos AS
SELECT 
    cp.id,
    cp.codigo_postal_completo as codigo_postal,
    d.nome_distrito as distrito,
    c.nome_concelho as concelho,
    cp.nome_localidade as localidade,
    cp.desig_postal as designacao_postal,
    cp.tipo_arteria,
    CONCAT_WS(' ', 
        cp.tipo_arteria,
        cp.prep1,
        cp.titulo_arteria, 
        cp.prep2,
        cp.nome_arteria
    ) as arteria_completa,
    cp.local_arteria,
    cp.porta,
    cp.cliente,
    cp.created_at,
    cp.updated_at
FROM codigos_postais cp
JOIN concelhos c ON cp.cod_distrito = c.cod_distrito AND cp.cod_concelho = c.cod_concelho
JOIN distritos d ON c.cod_distrito = d.cod_distrito;

-- Comentários nas funções
COMMENT ON FUNCTION buscar_por_codigo_postal(TEXT) IS 'Busca endereços por código postal completo (formato XXXX-XXX)';
COMMENT ON FUNCTION buscar_por_localidade(TEXT) IS 'Busca códigos postais por nome da localidade ou designação postal';
COMMENT ON FUNCTION buscar_por_distrito_concelho(TEXT, TEXT) IS 'Busca códigos postais por distrito e opcionalmente concelho';
COMMENT ON FUNCTION validar_codigo_postal(TEXT) IS 'Valida se um código postal existe na base de dados';
COMMENT ON FUNCTION buscar_endereco_texto(TEXT) IS 'Busca de texto completo em endereços com ranking de relevância';
COMMENT ON VIEW vw_enderecos_completos IS 'View simplificada com endereços completos formatados';
