# 🔧 Solução do Erro CORS no Login

## Problema Identificado

O erro CORS ocorria porque:

1. O frontend tentava aceder a `http://localhost:4002/api/login`
2. A configuração de CORS em `api/auth.js` não permitia requisições de `localhost`
3. O servidor de autenticação local não estava em execução

## ✅ Solução Implementada

### 1. **Criado servidor de autenticação local** (`scripts/custom_auth_backend.cjs`)

- Ouve na porta 4002
- Implementa endpoints `/api/login`, `/api/register`, `/api/change-password`
- CORS configurado para permitir requisições de desenvolvimento

### 2. **Atualizado CORS em `api/auth.js`**

- Adicionado `http://localhost:4200` e `http://127.0.0.1:4200`
- Adicionado `http://localhost:4002` e `http://127.0.0.1:4002`
- Suporta tanto desenvolvimento como produção

## 🚀 Como Usar

### Opção 1: Executar com npm start (Recomendado)

```bash
npm start
```

Isto inicia simultaneamente:

- ✅ Angular DevServer (porta 4200)
- ✅ Servidor de Email (send-email.cjs)
- ✅ Servidor de Autenticação (porta 4002)

### Opção 2: Executar apenas o servidor de autenticação

```bash
node scripts/custom_auth_backend.cjs
```

## ✨ Testar o Login

1. **Inicia o servidor:**

   ```bash
   npm start
   ```

2. **Abre o navegador:** http://localhost:4200

3. **Tenta fazer login** com credenciais válidas

4. **Verifica a consola do navegador** - não devem aparecer erros CORS

## 📊 Endpoints Disponíveis

### POST `/api/login`

```bash
curl -X POST http://localhost:4002/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### GET `/health` (Health Check)

```bash
curl http://localhost:4002/health
```

## 🐛 Se o Erro Persistir

1. **Verifica se a porta 4002 está disponível:**

   ```bash
   netstat -ano | findstr :4002  # Windows
   lsof -i :4002  # macOS/Linux
   ```

2. **Verifica o console do Node.js:**

   ```
   ✅ Servidor de autenticação rodando em http://localhost:4002
   ```

3. **Inspeciona a Network no Chrome DevTools:**
   - Abre DevTools (F12)
   - Vai a "Network"
   - Tenta fazer login
   - Verifica se o request para `http://localhost:4002/api/login` tem status 200

## 📝 Variáveis de Ambiente

Se precisares de customizar, podes adicionar ao `.env`:

```
AUTH_SERVER_PORT=4002
SUPABASE_URL=https://uqrvenlkquheajuveggv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Suporte:** Se os erros continuarem, verifica:

- ✅ Node.js instalado e atualizado
- ✅ Todas as dependências instaladas (`npm install`)
- ✅ Porta 4002 disponível
- ✅ Variáveis de ambiente do Supabase configuradas
