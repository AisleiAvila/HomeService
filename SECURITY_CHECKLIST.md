# 📋 Checklist de Segurança - HomeService

**Gerado em:** 16 de Dezembro de 2025  
**Versão:** 1.0  
**Status:** 🔴 CRÍTICO - Ação Necessária

---

## ✅ IMPLEMENTAÇÕES NECESSÁRIAS

### URGENTE 🔴 (Fazer HOJE)

#### 1. Criar Guarda de Autenticação
- [ ] Arquivo: `src/app/guards/auth.guard.ts`
- [ ] Código base em: `SECURITY_IMPLEMENTATION_GUIDE.md` - Passo 1
- [ ] Tempo estimado: **5 minutos**
- [ ] Criticidade: 🔴 CRÍTICA

```bash
# Depois de criar:
npm test  # Testar sintaxe
```

#### 2. Adicionar Guarda às Rotas
- [ ] Arquivo: `src/app/app.routes.ts`
- [ ] Rotas a proteger:
  - [ ] `/create-service-request` → `canActivate: [authGuard]`
  - [ ] `/admin-create-service-request` → `canActivate: [authGuard]`
- [ ] Tempo estimado: **5 minutos**
- [ ] Criticidade: 🔴 CRÍTICA

```bash
# Depois de modificar:
npm run build  # Verificar build
ng serve  # Testar em localhost:4200
```

#### 3. Testar Proteção
- [ ] Abrir DevTools
- [ ] Executar: `localStorage.clear()`
- [ ] Tentar acessar: http://localhost:4200/create-service-request
- [ ] Resultado esperado: Redirecionado para `/` (Landing)
- [ ] Tempo estimado: **3 minutos**

---

### ESTA SEMANA 🟡 (Implementar até Sexta)

#### 4. Adicionar CSRF Protection
- [ ] Arquivo: `api/auth.js`
- [ ] Installar: `npm install csurf express-session`
- [ ] Código base em: `SECURITY_IMPLEMENTATION_GUIDE.md` - Passo 3
- [ ] Tempo estimado: **15 minutos**
- [ ] Criticidade: 🟡 MÉDIA

```bash
# Após implementar:
npm test  # Testes
curl -X POST http://localhost:4000/api/login  # Testar CSRF
```

#### 5. Implementar Rate Limiting
- [ ] Arquivo: `api/auth.js`
- [ ] Adicionar função: `checkRateLimit(email)`
- [ ] Máximo 5 tentativas por 15 minutos
- [ ] Tempo estimado: **10 minutos**
- [ ] Criticidade: 🟡 MÉDIA

```typescript
// Teste local:
for (let i = 0; i < 6; i++) {
  await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({email, password})
  });
}
// 6ª tentativa deve retornar 429
```

#### 6. Adicionar Audit Logging
- [ ] Criar tabela: `audit_log` (Supabase)
- [ ] Registrar: login bem-sucedido, login falhado, logout
- [ ] Arquivo: `api/auth.js`
- [ ] Tempo estimado: **20 minutos**
- [ ] Criticidade: 🟡 MÉDIA

```sql
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  action VARCHAR(50),
  user_id BIGINT,
  email VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

---

### PRÓXIMO MÊS 🟢 (Nice-to-have)

#### 7. Migrar para JWT
- [ ] Backend: Gerar JWT ao fazer login
- [ ] Frontend: Armazenar em sessionStorage (não localStorage)
- [ ] Frontend: Enviar JWT em header Authorization
- [ ] Backend: Verificar JWT em cada requisição
- [ ] Tempo estimado: **2 horas**
- [ ] Criticidade: 🟢 BAIXA (mas recomendado)

#### 8. Implementar 2FA (Two-Factor Authentication)
- [ ] Email com código OTP
- [ ] Autenticador TOTP (Google Authenticator)
- [ ] Tempo estimado: **4 horas**
- [ ] Criticidade: 🟢 BAIXA

#### 9. Session Timeout
- [ ] Logout automático após 30 minutos de inatividade
- [ ] Mostrar aviso com countdown
- [ ] Tempo estimado: **30 minutos**
- [ ] Criticidade: 🟢 BAIXA

---

## 🔍 VERIFICAÇÃO DE SEGURANÇA

### Backend (/api/auth.js)

- [ ] **Validação de Entrada**
  - [ ] Email obrigatório?
  - [ ] Senha obrigatória?
  - [ ] Email é um endereço válido?
  - [ ] Senha tem mínimo X caracteres?

- [ ] **Autenticação**
  - [ ] Senha é hash (SHA256 ou bcrypt)?
  - [ ] Hash é comparado no servidor (não cliente)?
  - [ ] Rejeita credenciais inválidas com 401?
  - [ ] Rejeita email/senha vazia com 400?

- [ ] **Proteção**
  - [ ] HTTPS em produção (redireciona HTTP)?
  - [ ] CORS apenas de domínios confiáveis?
  - [ ] Rate limiting implementado?
  - [ ] CSRF token exigido em POST?

- [ ] **Logging**
  - [ ] Login bem-sucedido é registrado?
  - [ ] Login falhado é registrado?
  - [ ] Múltiplas tentativas falhadas alertam?

### Frontend (Angular)

- [ ] **Validação de Formulário**
  - [ ] Email validado antes de enviar?
  - [ ] Senha validada antes de enviar?
  - [ ] Mensagens de erro informativas?

- [ ] **Proteção de Rotas**
  - [ ] Rotas públicas: landing, login, reset-password
  - [ ] Rotas protegidas: create-service-request, admin
  - [ ] Guard verifica autenticação antes de carregar?
  - [ ] Redireciona para login se não autenticado?

- [ ] **Session Management**
  - [ ] localStorage é usado com cuidado?
  - [ ] Sessão é validada ao restaurar?
  - [ ] localStorage é limpo no logout?
  - [ ] Não armazena senhas em localStorage?

- [ ] **UI/UX**
  - [ ] Campo de senha mostra/oculta?
  - [ ] Mensagens de erro não expõem detalhes?
  - [ ] Loading indicator durante autenticação?
  - [ ] Redireciona após login bem-sucedido?

---

## 📊 Status de Implementação

### Checklist de Conclusão

```
CRÍTICA 🔴
  [ ] Auth Guard criado
  [ ] Rotas protegidas com auth guard
  [ ] Testes manual em localhost

MÉDIA 🟡
  [ ] CSRF protection
  [ ] Rate limiting
  [ ] Audit logging
  [ ] HTTPS em produção

BAIXA 🟢
  [ ] JWT implementado
  [ ] 2FA implementado
  [ ] Session timeout
```

### Progresso Geral

```
Hoje:     [██░░░░░░░░░░░░░░░░] 10% - Análise Concluída
Amanhã:   [████░░░░░░░░░░░░░░] 20% - Auth Guard Implementado
Semana:   [██████░░░░░░░░░░░░] 30% - Testes Passando
Mês:      [████████░░░░░░░░░░] 40% - Proteção Completa
```

---

## 🧪 Testes de Segurança

### Teste 1: Login sem Senha
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": ""}'

Esperado: 400 {"error": "Email e senha obrigatórios"}
```

### Teste 2: Credenciais Inválidas
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "wrong"}'

Esperado: 401 {"error": "Credenciais inválidas"}
```

### Teste 3: Acesso sem Autenticação
```bash
# Browser Developer Tools:
localStorage.clear()
window.location = '/create-service-request'

Esperado: Redirecionado para / (Landing)
```

### Teste 4: Email Verificado
```typescript
// Tentar fazer login com email não verificado
// Status deve ser "Pending"

Esperado: Login rejeitado ou mostrado formulário de verificação
```

### Teste 5: Usuário Inativo
```typescript
// User.status = "Inactive"

Esperado: 
  - Auth guard bloqueia
  - Redireciona para /
  - Mostra mensagem: "Usuário inativo"
```

---

## 🚨 Cenários de Ataque

### Cenário 1: Brute Force
```
Atacante tenta 100+ combinações de email/senha por segundo

Proteção:
✅ Rate Limiting: Máximo 5 tentativas por 15 minutos
✅ Audit Log: Registra todas as tentativas
✅ Alert: Admin é notificado de múltiplas tentativas
```

### Cenário 2: Session Hijacking
```
Atacante consegue localStorage do usuário

Proteção:
✅ HTTPS: Impede man-in-the-middle
✅ Validação Server: Sessão é verificada no servidor
✅ Session Timeout: Sessão expira após X minutos
✅ JWT com assinatura: Não pode ser falsificado
```

### Cenário 3: CSRF Attack
```
Site malicioso tenta fazer POST para /api/login

Proteção:
✅ CSRF Token: Exigido em cada POST
✅ SameSite Cookie: Não envia cookie para requests cross-site
✅ CORS: Apenas domínios confiáveis
```

### Cenário 4: XSS Attack
```
Código malicioso em localStorage

Proteção:
✅ Sanitização: DomSanitizer do Angular
✅ CSP Header: Content Security Policy
✅ Input Validation: Rejeita entrada maliciosa
```

---

## 📈 Métricas de Segurança

| Métrica | Objetivo | Status |
|---------|----------|--------|
| % de rotas protegidas | 100% | 🟡 70% (2/2 faltando) |
| Senha validada no servidor | ✅ Sim | ✅ 100% |
| HTTPS forçado | ✅ Sim | 🟡 Produção apenas |
| Rate limiting | ✅ Sim | ❌ 0% (não implementado) |
| CSRF protection | ✅ Sim | ❌ 0% (não implementado) |
| Audit logging | ✅ Sim | ❌ 0% (não implementado) |
| 2FA | ✅ Sim | ❌ 0% (não implementado) |

---

## 🔗 Referências Internas

- **SECURITY_SUMMARY.md** - Resumo Executivo (LER PRIMEIRO)
- **SECURITY_ANALYSIS.md** - Análise Técnica Detalhada
- **SECURITY_IMPLEMENTATION_GUIDE.md** - Guia com Código Pronto
- **SECURITY_FLOWS.md** - Diagramas de Fluxo de Segurança
- **src/app/guards/admin.guard.ts** - Exemplo de Implementação

---

## 🎯 Próximo Passo

1. Abra: `SECURITY_IMPLEMENTATION_GUIDE.md`
2. Siga: "Passo 1: Criar o Guarda de Autenticação"
3. Tempo: 15 minutos para completar os 3 passos críticos

**Data de Deadline:** Implementação crítica deve estar concluída ANTES da próxima release.

---

## ✋ PARAR AQUI!

Não continuar sem ter implementado os 3 passos críticos:
1. ✅ Auth Guard criado
2. ✅ Rotas protegidas
3. ✅ Testes passando em localhost

Após isso, pode prosseguir com melhorias (CSRF, Rate Limiting, etc).

