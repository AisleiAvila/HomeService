-- =====================================================
-- Adicionar campo de vínculo com Natan Construtora
-- =====================================================
-- Este script adiciona um campo booleano para identificar se o profissional
-- tem vínculo com a Natan Construtora ou é um prestador de serviços independente

-- 1. Adicionar coluna is_natan_employee à tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_natan_employee BOOLEAN DEFAULT false;

-- 2. Adicionar comentário explicativo na coluna
COMMENT ON COLUMN users.is_natan_employee IS 
'Indica se o profissional é funcionário da Natan Construtora (true) ou prestador de serviços independente (false)';

-- 3. Criar índice para melhorar performance em consultas filtradas por vínculo
CREATE INDEX IF NOT EXISTS idx_users_natan_employee 
ON users(is_natan_employee) 
WHERE role = 'professional';

-- 4. Atualizar profissionais existentes (opcional - ajustar conforme necessário)
-- Por padrão, todos os profissionais existentes são marcados como prestadores independentes
-- Se houver profissionais que são funcionários da Natan, execute UPDATE específico:
-- UPDATE users SET is_natan_employee = true WHERE id IN (1, 2, 3); -- IDs dos funcionários Natan

-- 5. Verificação final
SELECT 
    COUNT(*) as total_profissionais,
    COUNT(*) FILTER (WHERE is_natan_employee = true) as funcionarios_natan,
    COUNT(*) FILTER (WHERE is_natan_employee = false) as prestadores_independentes
FROM users 
WHERE role = 'professional';

-- ✅ Script concluído
-- Execute este script no SQL Editor do Supabase Dashboard
