-- =====================================================
-- Script para Inserção em Lotes de Códigos Postais
-- =====================================================

-- IMPORTANTE: Execute este script em partes, não tudo de uma vez
-- O Supabase tem limites de timeout para queries muito grandes

-- Primeiro, vamos criar um exemplo com alguns códigos postais de Lisboa
-- Você deve adaptar este script com seus dados CSV

-- Exemplo de inserção em lote (primeiros 100 registros)
INSERT INTO codigos_postais (
    cod_distrito, cod_concelho, cod_localidade, nome_localidade,
    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,
    nome_arteria, local_arteria, troco, porta, cliente,
    num_cod_postal, ext_cod_postal, desig_postal
) VALUES
-- Substitua pelos dados do seu CSV - exemplo com dados de Águeda:
('01', '01', '249', 'Alcafaz', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '011', 'AGADÃO'),
('01', '01', '250', 'Caselho', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '012', 'AGADÃO'),
('01', '01', '251', 'Corga da Serra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '013', 'AGADÃO'),
('01', '01', '252', 'Foz', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '014', 'AGADÃO'),
('01', '01', '253', 'Guistola', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '015', 'AGADÃO'),
('01', '01', '254', 'Guistolinha', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '016', 'AGADÃO'),
('01', '01', '255', 'Lomba', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '017', 'AGADÃO'),
('01', '01', '256', 'Povinha', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '018', 'AGADÃO'),
('01', '01', '257', 'Vila Mendo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3750', '019', 'AGADÃO'),
('01', '01', '258', 'Aguada de Baixo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PC AGUADA DE BAIXO', NULL, NULL, '3750', '996', 'AGUADA DE BAIXO')
ON CONFLICT DO NOTHING;

-- Verificar inserção
SELECT COUNT(*) as total_inseridos FROM codigos_postais;

-- PRÓXIMOS PASSOS:
-- 1. Abra o arquivo codigos_postais.csv
-- 2. Copie grupos de 50-100 linhas por vez
-- 3. Formate-as como INSERT statements como o exemplo acima
-- 4. Execute cada lote separadamente no SQL Editor

-- DICA: Para automatizar, use a interface de importação CSV do Supabase
