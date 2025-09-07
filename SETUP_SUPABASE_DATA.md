# Configuração de Dados no Supabase

## 🎯 **Visão Geral**

A aplicação HomeService foi configurada para buscar **todos os dados exclusivamente do Supabase**. Os dados mock foram removidos e a aplicação agora requer um banco de dados adequadamente configurado.

## 📋 **Tabelas Necessárias**

### 1. **Tabela `users`**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'professional', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Rejected')),
  avatar_url TEXT,
  phone TEXT,
  specialties TEXT[], -- Para profissionais
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Tabela `service_requests`**

```sql
CREATE TABLE service_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES users(id),
  professional_id INTEGER REFERENCES users(id),
  client_auth_id TEXT NOT NULL,
  professional_auth_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Quoted', 'Approved', 'In Progress', 'Completed', 'Cancelled')),
  payment_status TEXT CHECK (payment_status IN ('Paid', 'Unpaid')),
  requested_date TIMESTAMP NOT NULL,
  scheduled_date TIMESTAMP,
  cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. **Tabela `service_categories`**

```sql
CREATE TABLE service_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. **Tabela `chat_messages` (Opcional)**

```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER REFERENCES service_requests(id),
  sender_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);
```

## 📝 **Dados de Exemplo**

### **Usuários**

```sql
-- Admin User
INSERT INTO users (auth_id, name, email, role, status, avatar_url) VALUES
('admin-uuid', 'Sistema Admin', 'admin@homeservice.com', 'admin', 'Active', 'https://i.pravatar.cc/100?img=1');

-- Cliente
INSERT INTO users (auth_id, name, email, role, status, avatar_url, phone) VALUES
('client-uuid', 'João Silva', 'joao@email.com', 'client', 'Active', 'https://i.pravatar.cc/100?img=2', '+55 11 99999-1234');

-- Profissionais
INSERT INTO users (auth_id, name, email, role, status, avatar_url, phone, specialties) VALUES
('prof1-uuid', 'Maria Santos', 'maria@email.com', 'professional', 'Active', 'https://i.pravatar.cc/100?img=3', '+55 11 99999-5678', ARRAY['Plumbing', 'Electrical']),
('prof2-uuid', 'Carlos Lima', 'carlos@email.com', 'professional', 'Pending', 'https://i.pravatar.cc/100?img=4', '+55 11 99999-9012', ARRAY['Cleaning', 'Gardening']);
```

### **Categorias**

```sql
INSERT INTO service_categories (name, description) VALUES
('Plumbing', 'Serviços de encanamento e hidráulica'),
('Electrical', 'Serviços elétricos e instalações'),
('Cleaning', 'Serviços de limpeza doméstica'),
('Gardening', 'Jardinagem e paisagismo'),
('Painting', 'Pintura residencial e comercial'),
('Carpentry', 'Marcenaria e carpintaria'),
('HVAC', 'Ar condicionado e ventilação');
```

### **Requisições de Exemplo**

```sql
INSERT INTO service_requests (
  client_id, client_auth_id, title, description, category,
  street, city, state, zip_code, status, payment_status,
  requested_date, cost
) VALUES
(2, 'client-uuid', 'Reparo do Encanamento', 'Vazamento na cozinha precisa de reparo urgente', 'Plumbing',
 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'Completed', 'Paid',
 '2024-03-01 10:00:00', 150.00),

(2, 'client-uuid', 'Instalação Elétrica', 'Instalar tomadas na sala de estar', 'Electrical',
 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'Pending', 'Unpaid',
 '2024-03-05 09:00:00', NULL);
```

## 🔧 **Configuração de Autenticação**

### **1. Políticas RLS (Row Level Security)**

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid()::text = auth_id);

-- Políticas para service_requests
CREATE POLICY "Admin can view all requests" ON service_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Clients can view own requests" ON service_requests FOR SELECT TO authenticated USING (
  client_auth_id = auth.uid()::text
);

CREATE POLICY "Professionals can view assigned requests" ON service_requests FOR SELECT TO authenticated USING (
  professional_auth_id = auth.uid()::text OR professional_auth_id IS NULL
);

-- Políticas para categorias (todos podem ler)
CREATE POLICY "Anyone can view categories" ON service_categories FOR SELECT TO authenticated USING (true);
```

### **2. Triggers para Sincronização**

```sql
-- Trigger para atualizar auth_id quando um usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, name, role, status)
  VALUES (NEW.id::text, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), 'client', 'Active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 🚀 **Como Usar**

### **1. Criar Usuário Admin**

1. Registre-se normalmente na aplicação
2. No Supabase Dashboard, vá para Authentication > Users
3. Encontre seu usuário e copie o `User UID`
4. No SQL Editor, execute:

```sql
UPDATE users SET role = 'admin' WHERE auth_id = 'SEU_USER_UID_AQUI';
```

### **2. Popular Dados**

1. Execute os scripts SQL acima no Supabase SQL Editor
2. Ajuste os dados conforme necessário
3. Faça login na aplicação com suas credenciais

### **3. Testar Dashboard**

1. Faça login com a conta admin
2. Acesse a aba "Dashboard"
3. Todas as informações agora vêm do Supabase!

## ⚠️ **Notas Importantes**

- **Sem dados mock**: A aplicação não funcionará sem dados no Supabase
- **RLS obrigatório**: Configure as políticas de segurança adequadamente
- **Backup**: Sempre faça backup antes de modificar dados de produção
- **Performance**: Para muitos dados, considere indexação adequada

## 🔍 **Solução de Problemas**

### **Dashboard vazio?**

1. Verifique se as tabelas existem
2. Confirme se há dados nas tabelas
3. Verifique as políticas RLS
4. Olhe o console do navegador para erros

### **Erro de autenticação?**

1. Confirme se o usuário tem role 'admin'
2. Verifique se auth_id está correto
3. Teste as políticas RLS

### **Categorias não aparecem?**

1. Verifique se a tabela `service_categories` existe
2. Confirme se há dados na tabela
3. Verifique políticas de acesso

---

✅ **Resultado**: Aplicação totalmente integrada com Supabase, sem dependência de dados mock!
