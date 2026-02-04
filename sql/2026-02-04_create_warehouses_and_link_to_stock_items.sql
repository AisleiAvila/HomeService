-- Criação da tabela de armazéns
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona coluna warehouse_id à tabela stock_items
ALTER TABLE stock_items
ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);
