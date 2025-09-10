-- =====================================
-- PASSO 5: Inserir dados de exemplo (OPCIONAL)
-- =====================================

-- 5.1. Inserir dados de exemplo com endereços portugueses
-- ATENÇÃO: Execute apenas se quiser dados de exemplo
INSERT INTO service_requests (
  client_id, client_auth_id, title, description, category,
  street, city, state, zip_code, freguesia, concelho,
  status, payment_status, requested_date
) VALUES
(1, 'client-uuid-exemplo', 'Reparação de canalização', 'Fuga de água na cozinha que precisa de reparo urgente', 'Plumbing',
 'Rua Augusta, 123, 2º Esq', 'Lisboa', 'Lisboa', '1100-048', 'Santa Maria Maior', 'Lisboa',
 'Pending', 'Unpaid', NOW()),

(1, 'client-uuid-exemplo', 'Instalação elétrica', 'Instalar tomadas na sala de estar', 'Electrical',
 'Avenida dos Aliados, 456', 'Porto', 'Porto', '4000-066', 'Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória', 'Porto',
 'Pending', 'Unpaid', NOW()),

(1, 'client-uuid-exemplo', 'Limpeza doméstica', 'Limpeza geral da casa', 'Cleaning',
 'Rua Ferreira Borges, 789', 'Coimbra', 'Coimbra', '3000-180', 'Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)', 'Coimbra',
 'Pending', 'Unpaid', NOW())
ON CONFLICT DO NOTHING;

-- 5.2. Atualizar um usuário exemplo com endereço português (OPCIONAL)
-- ATENÇÃO: Ajuste o email para um usuário real ou remova este comando
UPDATE users 
SET 
  address_street = 'Rua das Flores, 123',
  address_city = 'Lisboa',
  address_state = 'Lisboa',
  address_zip_code = '1200-192',
  address_freguesia = 'Estrela',
  address_concelho = 'Lisboa'
WHERE email = 'cliente@homeservice.com' 
AND address_street IS NULL;

-- 5.3. Verificar dados inseridos
SELECT 
  'Dados de exemplo inseridos' as resultado,
  COUNT(*) as total_service_requests
FROM service_requests 
WHERE zip_code LIKE '____-___';

-- Finalização
SELECT 'Script executado com sucesso! Sistema pronto para endereços portugueses.' as status;
