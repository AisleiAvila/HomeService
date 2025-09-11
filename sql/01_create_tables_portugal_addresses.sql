-- =====================================================
-- Script de Criação das Tabelas para Endereços de Portugal
-- =====================================================

-- Criação da tabela de distritos
CREATE TABLE IF NOT EXISTS distritos (
    cod_distrito VARCHAR(2) PRIMARY KEY,
    nome_distrito VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE distritos IS 'Tabela com os distritos de Portugal';
COMMENT ON COLUMN distritos.cod_distrito IS 'Código único do distrito (01-49)';
COMMENT ON COLUMN distritos.nome_distrito IS 'Nome completo do distrito';

-- Criação da tabela de concelhos/municípios
CREATE TABLE IF NOT EXISTS concelhos (
    cod_distrito VARCHAR(2) NOT NULL,
    cod_concelho VARCHAR(2) NOT NULL,
    nome_concelho VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Chave primária composta
    PRIMARY KEY (cod_distrito, cod_concelho),
    
    -- Chave estrangeira para distritos
    CONSTRAINT fk_concelhos_distrito 
        FOREIGN KEY (cod_distrito) 
        REFERENCES distritos(cod_distrito) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Comentários para documentação
COMMENT ON TABLE concelhos IS 'Tabela com os concelhos/municípios de Portugal';
COMMENT ON COLUMN concelhos.cod_distrito IS 'Código do distrito (FK)';
COMMENT ON COLUMN concelhos.cod_concelho IS 'Código único do concelho dentro do distrito';
COMMENT ON COLUMN concelhos.nome_concelho IS 'Nome completo do concelho';

-- Criação da tabela de códigos postais
CREATE TABLE IF NOT EXISTS codigos_postais (
    id BIGSERIAL PRIMARY KEY,
    cod_distrito VARCHAR(2) NOT NULL,
    cod_concelho VARCHAR(2) NOT NULL,
    cod_localidade VARCHAR(10),
    nome_localidade VARCHAR(100),
    cod_arteria VARCHAR(20),
    tipo_arteria VARCHAR(50),
    prep1 VARCHAR(10),
    titulo_arteria VARCHAR(50),
    prep2 VARCHAR(10),
    nome_arteria VARCHAR(100),
    local_arteria VARCHAR(100),
    troco VARCHAR(100),
    porta VARCHAR(20),
    cliente VARCHAR(100),
    num_cod_postal VARCHAR(4) NOT NULL,
    ext_cod_postal VARCHAR(3) NOT NULL,
    desig_postal VARCHAR(100) NOT NULL,
    codigo_postal_completo VARCHAR(8) GENERATED ALWAYS AS (num_cod_postal || '-' || ext_cod_postal) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Chave estrangeira para concelhos
    CONSTRAINT fk_codigos_postais_concelho 
        FOREIGN KEY (cod_distrito, cod_concelho) 
        REFERENCES concelhos(cod_distrito, cod_concelho) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    -- Constraints de validação
    CONSTRAINT chk_num_cod_postal CHECK (num_cod_postal ~ '^[0-9]{4}$'),
    CONSTRAINT chk_ext_cod_postal CHECK (ext_cod_postal ~ '^[0-9]{3}$')
);

-- Comentários para documentação
COMMENT ON TABLE codigos_postais IS 'Tabela detalhada com todos os códigos postais de Portugal';
COMMENT ON COLUMN codigos_postais.cod_distrito IS 'Código do distrito (FK)';
COMMENT ON COLUMN codigos_postais.cod_concelho IS 'Código do concelho (FK)';
COMMENT ON COLUMN codigos_postais.cod_localidade IS 'Código da localidade';
COMMENT ON COLUMN codigos_postais.nome_localidade IS 'Nome da localidade';
COMMENT ON COLUMN codigos_postais.cod_arteria IS 'Código da artéria/rua';
COMMENT ON COLUMN codigos_postais.tipo_arteria IS 'Tipo de artéria (Rua, Largo, Avenida, etc.)';
COMMENT ON COLUMN codigos_postais.nome_arteria IS 'Nome da artéria/rua';
COMMENT ON COLUMN codigos_postais.num_cod_postal IS 'Primeiros 4 dígitos do código postal';
COMMENT ON COLUMN codigos_postais.ext_cod_postal IS 'Últimos 3 dígitos do código postal';
COMMENT ON COLUMN codigos_postais.desig_postal IS 'Designação postal (localidade principal)';
COMMENT ON COLUMN codigos_postais.codigo_postal_completo IS 'Código postal completo no formato XXXX-XXX (campo calculado)';

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_distritos_updated_at 
    BEFORE UPDATE ON distritos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concelhos_updated_at 
    BEFORE UPDATE ON concelhos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_codigos_postais_updated_at 
    BEFORE UPDATE ON codigos_postais 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
