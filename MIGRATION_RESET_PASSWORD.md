# Guia de Migração: Reset de Senha Customizado

## Problema Resolvido

O sistema estava tentando usar o Supabase Auth para reset de senha, mas a aplicação usa um sistema de autenticação customizado. Usuários não existem em `auth.users`, apenas na tabela `users` customizada.

## Alterações Implementadas

### 1. AuthService (`src/services/auth.service.ts`)

- ✅ `sendPasswordResetCode()`: Gera código de 6 dígitos e envia via email customizado
- ✅ `verifyPasswordResetCode()`: Verifica código contra a tabela `users`
- ✅ `updatePasswordWithCode()`: Atualiza senha na tabela `users`

### 2. Modelo de Dados (`src/models/maintenance.models.ts`)

- ✅ Adicionado `reset_token?: string | null`
- ✅ Adicionado `reset_token_expiry?: string | null`

### 3. Migration SQL (`scripts/add_reset_password_fields.sql`)

- ✅ Criado script para adicionar colunas no Supabase

## Como Executar a Migration

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto: `uqrvenlkquheajuveggv`
3. Vá para **SQL Editor**
4. Copie e cole o conteúdo de `scripts/add_reset_password_fields.sql`
5. Clique em **Run**

### Opção 2: Via Supabase CLI

```bash
# Se você tiver o Supabase CLI instalado
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.uqrvenlkquheajuveggv.supabase.co:5432/postgres" < scripts/add_reset_password_fields.sql
```

### Opção 3: Via psql

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.uqrvenlkquheajuveggv.supabase.co:5432/postgres" -f scripts/add_reset_password_fields.sql
```

## Fluxo do Reset de Senha

1. **Usuário solicita reset** → `forgot-password.component.ts`
2. **Código gerado** → 6 dígitos aleatórios
3. **Token salvo** → Tabela `users` com expiração de 15 minutos
4. **Email enviado** → Via servidor local `http://localhost:4001/api/send-email`
5. **Usuário insere código** → `reset-password.component.ts`
6. **Código verificado** → Comparação com token na BD
7. **Senha atualizada** → Direto na tabela `users`

## Validações Implementadas

- ✅ Email deve existir na tabela `users`
- ✅ Token expira em 15 minutos
- ✅ Código de 6 dígitos numéricos
- ✅ Token é limpo após uso bem-sucedido
- ✅ Validação de formato de email

## Próximos Passos (Segurança)

### 🔐 IMPORTANTE: Hash de Senhas

Atualmente a senha está sendo salva em texto plano. Para produção, você deve:

1. Implementar hash de senha no backend
2. Usar bcrypt ou Argon2
3. Nunca armazenar senhas em texto plano

Exemplo de implementação segura:

```typescript
// No backend (Node.js com bcrypt)
const bcrypt = require("bcrypt");
const hashedPassword = await bcrypt.hash(newPassword, 10);

// Salvar hashedPassword na BD em vez de newPassword
```

## Verificação

Após executar a migration, verifique se as colunas foram criadas:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('reset_token', 'reset_token_expiry');
```

Resultado esperado:

```
column_name        | data_type
-------------------+---------------------------
reset_token        | character varying
reset_token_expiry | timestamp with time zone
```

## Testando o Fluxo

### Pré-requisitos

1. **Servidor de email rodando**:

   ```bash
   node send-email.cjs
   ```

   O servidor deve estar rodando na porta 4001

2. **Migration executada**: Colunas `reset_token` e `reset_token_expiry` devem existir

### Passos de Teste

1. **Solicitar reset de senha**:

   - Acesse `/forgot-password`
   - Insira um email existente (ex: `aislei@outlook.com.br`)
   - Clique em "Enviar código"
   - ✅ Deve mostrar: "Um código de redefinição foi enviado para seu e-mail"

2. **Verificar email**:

   - Verifique sua caixa de entrada
   - Procure email com assunto: "Redefinição de senha - HomeService"
   - Copie o código de 6 dígitos

3. **Verificar token na BD** (opcional):

   ```sql
   SELECT email, reset_token, reset_token_expiry
   FROM users
   WHERE email = 'aislei@outlook.com.br';
   ```

4. **Inserir código**:

   - Cole o código de 6 dígitos na tela
   - Clique em "Verificar código"
   - ✅ Deve avançar para tela de nova senha

5. **Definir nova senha**:

   - Digite nova senha (mínimo 6 caracteres)
   - Confirme a senha
   - Clique em "Redefinir senha"
   - ✅ Deve mostrar: "Senha atualizada com sucesso!"

6. **Fazer login**:
   - Vá para tela de login
   - Use o email e a NOVA senha
   - ✅ Login deve funcionar normalmente

### Teste de Expiração

1. Solicite reset de senha
2. Aguarde mais de 15 minutos
3. Tente usar o código
4. ✅ Deve mostrar: "Código inválido ou expirado"

### Teste de Código Inválido

1. Solicite reset de senha
2. Digite código incorreto (ex: "000000")
3. ✅ Deve mostrar: "Código inválido ou expirado"

## Troubleshooting

### Erro: "E-mail não encontrado em nosso sistema"

- Verifique se o email existe na tabela `users`
- Confira se está usando o email correto

### Erro: "Código inválido ou expirado"

- Token expira em 15 minutos
- Solicite novo código

### Email não está sendo enviado

- Verifique se o servidor está rodando: `http://localhost:4001`
- Confira logs do servidor de email
- Token é salvo mesmo se email falhar

## Arquivos Modificados

- `src/services/auth.service.ts` - Lógica de reset customizada
- `src/models/maintenance.models.ts` - Modelo User atualizado
- `scripts/add_reset_password_fields.sql` - Migration SQL
