-- Criação da tabela de subcategorias de serviço
CREATE TABLE IF NOT EXISTS service_subcategories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE
);

-- Adiciona coluna subcategory_id à tabela service_requests
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES service_subcategories(id);

-- Exemplo de inserção de subcategorias
-- INSERT INTO service_subcategories (name, category_id) VALUES ('Instalação', 1), ('Manutenção', 1);

-- Para popular o campo subcategory_id em service_requests, use UPDATE conforme necessário.
