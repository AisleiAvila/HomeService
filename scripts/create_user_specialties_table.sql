-- Tabela de especialidades de profissionais
CREATE TABLE IF NOT EXISTS user_specialties (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas rápidas por categoria
CREATE INDEX IF NOT EXISTS idx_user_specialties_category_id ON user_specialties(category_id);

-- Índice para consultas rápidas por usuário
CREATE INDEX IF NOT EXISTS idx_user_specialties_user_id ON user_specialties(user_id);
