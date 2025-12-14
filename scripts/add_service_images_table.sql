-- Criação da tabela para armazenar imagens de solicitações de serviço
-- Permite que profissionais registrem imagens antes e depois da execução

CREATE TABLE IF NOT EXISTS service_request_images (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('before', 'after')),
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  CONSTRAINT fk_service_request FOREIGN KEY (service_request_id) REFERENCES service_requests(id),
  CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_service_request_images_request_id ON service_request_images(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_images_uploaded_by ON service_request_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_service_request_images_type ON service_request_images(image_type);
CREATE INDEX IF NOT EXISTS idx_service_request_images_uploaded_at ON service_request_images(uploaded_at);

-- Comentários para documentação
COMMENT ON TABLE service_request_images IS 'Armazena imagens relacionadas a solicitações de serviço (antes e depois da execução)';
COMMENT ON COLUMN service_request_images.service_request_id IS 'ID da solicitação de serviço relacionada';
COMMENT ON COLUMN service_request_images.uploaded_by IS 'ID do usuário que fez o upload (geralmente profissional)';
COMMENT ON COLUMN service_request_images.image_url IS 'URL da imagem armazenada no Supabase Storage';
COMMENT ON COLUMN service_request_images.image_type IS 'Tipo da imagem: before (antes) ou after (depois)';
COMMENT ON COLUMN service_request_images.description IS 'Descrição opcional da imagem';
COMMENT ON COLUMN service_request_images.uploaded_at IS 'Data e hora do upload';
COMMENT ON COLUMN service_request_images.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN service_request_images.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN service_request_images.mime_type IS 'Tipo MIME do arquivo (ex: image/jpeg, image/png)';

-- Nota: RLS desabilitado - Segurança gerenciada na camada da aplicação Angular
-- A aplicação controla acesso através do AuthService e validações no código TypeScript

-- Criar bucket no Supabase Storage para imagens de serviços
-- Nota: Este comando precisa ser executado via código ou console do Supabase
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('service-images', 'service-images', true);
