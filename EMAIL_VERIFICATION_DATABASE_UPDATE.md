# Atualização da Base de Dados para Verificação de Email

## 📋 **Script SQL para Executar no Supabase**

### **1. Adicionar Campo email_verified na Tabela users**

```sql
-- Adicionar campo email_verified (padrão false)
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Atualizar usuários existentes para true (assumindo que já estão ativos)
UPDATE users
SET email_verified = true
WHERE status = 'Active';

-- Criar índice para performance
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

### **2. Atualizar Trigger para Novos Usuários**

```sql
-- Modificar a função handle_new_user para definir email_verified como false
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, name, role, status, email_verified)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    'client',
    'Active',
    false  -- Email não verificado por padrão
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **3. Função para Verificar Email**

```sql
-- Função para atualizar email_verified quando usuário verifica email
CREATE OR REPLACE FUNCTION verify_user_email(user_auth_id text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET email_verified = true
  WHERE auth_id = user_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **4. Política RLS para Email Verificado**

```sql
-- Política para permitir acesso apenas a usuários com email verificado
CREATE POLICY "Users must have verified email" ON service_requests
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()::text
    AND email_verified = true
  )
);
```

## 🎯 **Como Executar**

1. **Abra o Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Execute os scripts em ordem**
4. **Confirme que o campo foi adicionado na tabela users**

## ✅ **Resultado Esperado**

- ✅ Campo `email_verified` adicionado na tabela users
- ✅ Usuários existentes marcados como verificados
- ✅ Novos usuários começam com `email_verified = false`
- ✅ Função disponível para verificar email

---

**Próximo Passo**: Atualizar o código da aplicação para usar o campo `email_verified`
