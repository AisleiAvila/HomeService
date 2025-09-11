-- =====================================================
-- Script de Criação de Índices para Otimização
-- =====================================================

-- Índices para a tabela distritos
CREATE INDEX IF NOT EXISTS idx_distritos_nome 
    ON distritos USING gin(to_tsvector('portuguese', nome_distrito));

-- Índices para a tabela concelhos
CREATE INDEX IF NOT EXISTS idx_concelhos_distrito 
    ON concelhos(cod_distrito);

CREATE INDEX IF NOT EXISTS idx_concelhos_nome 
    ON concelhos USING gin(to_tsvector('portuguese', nome_concelho));

-- Índices para a tabela codigos_postais
CREATE INDEX IF NOT EXISTS idx_codigos_postais_distrito_concelho 
    ON codigos_postais(cod_distrito, cod_concelho);

CREATE INDEX IF NOT EXISTS idx_codigos_postais_codigo_completo 
    ON codigos_postais(num_cod_postal, ext_cod_postal);

CREATE INDEX IF NOT EXISTS idx_codigos_postais_codigo_parcial 
    ON codigos_postais(num_cod_postal);

CREATE INDEX IF NOT EXISTS idx_codigos_postais_localidade 
    ON codigos_postais(nome_localidade);

CREATE INDEX IF NOT EXISTS idx_codigos_postais_desig_postal 
    ON codigos_postais(desig_postal);

CREATE INDEX IF NOT EXISTS idx_codigos_postais_arteria 
    ON codigos_postais(nome_arteria) WHERE nome_arteria IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_codigos_postais_tipo_arteria 
    ON codigos_postais(tipo_arteria) WHERE tipo_arteria IS NOT NULL;

-- Índice para busca de texto completo em nome da artéria
CREATE INDEX IF NOT EXISTS idx_codigos_postais_arteria_text 
    ON codigos_postais USING gin(to_tsvector('portuguese', nome_arteria)) 
    WHERE nome_arteria IS NOT NULL;

-- Índice para busca de texto completo em localidade
CREATE INDEX IF NOT EXISTS idx_codigos_postais_localidade_text 
    ON codigos_postais USING gin(to_tsvector('portuguese', nome_localidade)) 
    WHERE nome_localidade IS NOT NULL;

-- Índice para busca de texto completo em designação postal
CREATE INDEX IF NOT EXISTS idx_codigos_postais_desig_text 
    ON codigos_postais USING gin(to_tsvector('portuguese', desig_postal));

-- Índice composto para consultas frequentes por distrito + código postal
CREATE INDEX IF NOT EXISTS idx_codigos_postais_distrito_codigo 
    ON codigos_postais(cod_distrito, num_cod_postal, ext_cod_postal);

-- Índice para campos calculados
CREATE INDEX IF NOT EXISTS idx_codigos_postais_codigo_completo_calculated 
    ON codigos_postais(codigo_postal_completo);

-- Estatísticas para otimização do query planner
ANALYZE distritos;
ANALYZE concelhos;
ANALYZE codigos_postais;
