-- Adicionar campos de dados do solicitante à tabela service_requests
-- Estes campos armazenam informações do solicitante do serviço

-- Verifica e adiciona o campo client_name se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'client_name'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN client_name TEXT;
        COMMENT ON COLUMN service_requests.client_name IS 'Nome do solicitante do serviço';
    END IF;
END $$;

-- Verifica e adiciona o campo client_phone se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'client_phone'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN client_phone TEXT;
        COMMENT ON COLUMN service_requests.client_phone IS 'Telefone do solicitante do serviço';
    END IF;
END $$;

-- Verifica e adiciona o campo client_nif se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'client_nif'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN client_nif TEXT;
        COMMENT ON COLUMN service_requests.client_nif IS 'NIF do solicitante do serviço (opcional)';
    END IF;
END $$;

-- Verifica e adiciona o campo email_client se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'email_client'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN email_client TEXT;
        COMMENT ON COLUMN service_requests.email_client IS 'Email do solicitante do serviço';
    END IF;
END $$;

-- Nota: Os dados de endereço do serviço já existem na tabela service_requests
-- nos campos: street, street_number, complement, city, state, zip_code, latitude, longitude

-- Índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_service_requests_client_phone ON service_requests(client_phone);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_nif ON service_requests(client_nif);

-- Mensagem de conclusão
SELECT 'Campos de dados do solicitante adicionados com sucesso à tabela service_requests!' as message;
