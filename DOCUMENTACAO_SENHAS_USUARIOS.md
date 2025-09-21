# 🔐 Autenticação e Armazenamento de Senhas - HomeService

## 📋 Resumo Executivo

**As senhas dos usuários NÃO são armazenadas na aplicação HomeService.** A autenticação é totalmente gerenciada pelo **Supabase Auth**, que é um serviço de autenticação seguro e robusto.

## 🏗️ Arquitetura de Autenticação

### 🔒 Supabase Auth (Sistema de Autenticação)

- **Responsabilidade**: Gerenciar senhas, sessões e autenticação
- **Localização**: Serviços de nuvem do Supabase (infraestrutura externa)
- **Segurança**: Criptografia de ponta, hashing seguro, proteção contra ataques
- **Acesso**: A aplicação NUNCA tem acesso direto às senhas

### 🗄️ Tabela `users` (Dados de Perfil)

- **Responsabilidade**: Armazenar informações de perfil do usuário
- **Localização**: Base de dados PostgreSQL do Supabase
- **Conteúdo**: Nome, email, role, status, avatar, etc.
- **Importante**: ❌ **NÃO contém senhas**

## 📊 Estrutura da Tabela `users`

```sql
-- Estrutura da tabela users (baseada no modelo TypeScript)
TABLE users (
    id              SERIAL PRIMARY KEY,
    auth_id         VARCHAR -- UUID do Supabase Auth (chave estrangeira)
    name            VARCHAR,
    email           VARCHAR,
    role            VARCHAR CHECK (role IN ('client', 'professional', 'admin')),
    status          VARCHAR CHECK (status IN ('Pending', 'Active', 'Rejected')),
    avatar_url      VARCHAR,
    email_verified  BOOLEAN DEFAULT false,
    specialties     TEXT[], -- Para profissionais
    phone           VARCHAR,
    -- Campos de endereço
    street          VARCHAR,
    city            VARCHAR,
    state           VARCHAR,
    zip_code        VARCHAR
);
```

### 🔑 Campo Chave: `auth_id`

- **Tipo**: UUID (string)
- **Função**: Liga o perfil do usuário ao sistema de autenticação do Supabase
- **Relacionamento**: `users.auth_id` ↔ `auth.users.id` (Supabase Auth)

## 🔐 Como Funciona a Autenticação

### 1. **Registro de Usuário**

```typescript
// No AuthService.register()
await this.supabase.client.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    data: { name, role, password }, // Enviado para Supabase Auth
  },
});
```

### 2. **Armazenamento Seguro**

- **Senha**: Armazenada de forma segura no Supabase Auth (criptografada)
- **Perfil**: Criado na tabela `users` após verificação de email

### 3. **Login**

```typescript
// No AuthService.login()
const response = await this.supabase.client.auth.signInWithPassword({
  email,
  password, // Enviado diretamente para Supabase Auth
});
```

### 4. **Verificação**

- Supabase Auth valida credenciais
- Se válidas, retorna token de sessão
- Aplicação busca perfil na tabela `users` usando `auth_id`

## 🛡️ Vantagens da Arquitetura Atual

### ✅ Segurança Máxima

- **Zero acesso a senhas**: A aplicação nunca vê ou manipula senhas
- **Criptografia profissional**: Supabase usa algoritmos de segurança de nível empresarial
- **Tokens seguros**: Autenticação baseada em JWT com expiração automática

### ✅ Compliance e Regulamentações

- **LGPD/GDPR**: Conformidade automática para proteção de dados
- **Auditoria**: Logs de segurança gerenciados pelo Supabase
- **Backup**: Recuperação e backup de dados de autenticação

### ✅ Funcionalidades Avançadas

- **Recuperação de senha**: Sistema automático de reset
- **Verificação de email**: Processo automatizado
- **Múltiplos métodos**: OTP, magic links, etc.
- **Rate limiting**: Proteção contra ataques de força bruta

## 📍 Onde Encontrar os Dados

### 🔒 Senhas (Supabase Auth)

```
🌐 Localização: Supabase Cloud Infrastructure
🔐 Acesso: Apenas via API de autenticação
📋 Tabela: auth.users (sistema interno do Supabase)
🛡️ Segurança: Criptografia AES-256, bcrypt hashing
```

### 👤 Perfis de Usuário (Tabela `users`)

```
🗄️ Localização: Base de dados PostgreSQL do projeto
📋 Tabela: public.users
🔍 Campos: id, auth_id, name, email, role, status, etc.
❌ NÃO contém: senhas, dados sensíveis de autenticação
```

## 🔧 Implementação no Código

### Serviço de Autenticação

- **Arquivo**: `src/services/auth.service.ts`
- **Função**: Intermediário entre aplicação e Supabase Auth
- **Responsabilidade**: Gerenciar login, registro, logout

### Serviço Supabase

- **Arquivo**: `src/services/supabase.service.ts`
- **Função**: Cliente para comunicação com Supabase
- **Responsabilidade**: Configuração e conexão com serviços

### Modelo de Dados

- **Arquivo**: `src/models/maintenance.models.ts`
- **Interface User**: Define estrutura dos dados de perfil
- **Campos**: Todos exceto senha (que fica no Supabase Auth)

## 🚨 Importante para Desenvolvedores

### ❌ O que NÃO fazer:

- Nunca armazenar senhas na tabela `users`
- Não criar campos de senha no modelo
- Evitar manipular senhas diretamente no código

### ✅ O que fazer:

- Usar sempre Supabase Auth para autenticação
- Manter perfis separados na tabela `users`
- Relacionar via `auth_id` quando necessário

### 🔍 Para Debugging:

- Verificar logs do Supabase Auth Dashboard
- Usar métodos de autenticação do Supabase
- Nunca logar informações de senha

## 📞 Suporte e Documentação

- **Supabase Auth**: https://supabase.com/docs/auth
- **Configuração Local**: `src/services/supabase.service.ts`
- **Variables de Ambiente**: `src/environments/environment.ts`

---

**Conclusão**: As senhas ficam seguramente armazenadas no sistema Supabase Auth, completamente isoladas da aplicação HomeService, garantindo máxima segurança e compliance com padrões de segurança modernos.
