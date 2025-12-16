# Fluxos de Segurança - HomeService

## 1️⃣ Fluxo de Login (Correto ✅)

```
┌─────────────────────┐
│ Tela de Login       │
│ [email]             │
│ [senha]             │
│ [Login]             │
└──────────┬──────────┘
           │
           ├─► Validação Frontend
           │   ✅ Email válido?
           │   ✅ Senha >= 6 caracteres?
           │   ❌ Falha → Mostra erro
           │
           └─► POST /api/login {email, password}
               │
               ├─► Validação Backend
               │   ✅ Email e senha obrigatórios?
               │   ✅ Email existe?
               │   ✅ Hash da senha bate?
               │   ❌ Falha → Retorna 401
               │
               └─► ✅ Login bem-sucedido
                   ├─ Sessão criada
                   ├─ Usuário armazenado em appUser signal
                   ├─ Sessão salva em localStorage
                   └─ Redireciona para dashboard
```

---

## 2️⃣ Fluxo de Acesso a Rota (ANTES - Inseguro ❌)

```
Usuário tenta acessar: /create-service-request

┌──────────────────────────┐
│ URL Browser              │
│ /create-service-request  │
└────────┬─────────────────┘
         │
         ├─► ❌ NENHUMA VALIDAÇÃO
         │   (Router não tem canActivate)
         │
         └─► Carrega CreateServiceRequestComponent
             │
             ├─► ngOnInit() tenta acessar
             │   authService.appUser() = null
             │
             └─► ❌ Comportamento indefinido
                 - UI quebra
                 - Erros de console
                 - Possível exposição de dados

CENÁRIO DE ATAQUE:
1. Usuário faz logout (localStorage limpo)
2. Browser salva URL: /create-service-request
3. Usuário acessa link compartilhado
4. Componente carrega sem autenticação
```

---

## 3️⃣ Fluxo de Acesso a Rota (DEPOIS - Seguro ✅)

```
Usuário tenta acessar: /create-service-request

┌──────────────────────────┐
│ URL Browser              │
│ /create-service-request  │
└────────┬─────────────────┘
         │
         └─► ROUTER VALIDA: canActivate: [authGuard]
             │
             ├─► authGuard executa
             │   │
             │   ├─ Verifica: authService.appUser() != null?
             │   │   ✅ SIM → Permite acesso
             │   │   ❌ NÃO → Bloqueia (veja abaixo)
             │   │
             │   └─ Verifica: user.status == 'Active'?
             │       ✅ SIM → Permite acesso
             │       ❌ NÃO → Bloqueia (veja abaixo)
             │
             └─► ✅ Todas validações passaram
                 Carrega CreateServiceRequestComponent
                 Componente tem acesso a appUser válido

QUANDO BLOQUEADO (Nenhum appUser):
┌─────────────────┐
│ Auth Guard      │
│ appUser == null │
└────────┬────────┘
         │
         └─► Redireciona para: /
             Mostra: Tela de Login
             Salva: ?returnUrl=/create-service-request
             
(Usuário faz login → Redireciona para /create-service-request automaticamente)
```

---

## 4️⃣ Fluxo de Session Recovery (Restauração)

```
CENÁRIO: Usuário faz refresh na página

┌─────────────────────────┐
│ App Inicia (Bootstrap)  │
└────────┬────────────────┘
         │
         └─► AppComponent.ngOnInit()
             │
             ├─► authService.restoreSessionFromStorage()
             │   │
             │   ├─ localStorage.getItem("homeservice_user_session")
             │   │
             │   ├─► ✅ Sessão encontrada
             │   │   │
             │   │   ├─ JSON.parse(sessionData)
             │   │   ├─ authService.appUser.set(user)
             │   │   │
             │   │   └─► ✅ refreshAppUser(user.email)
             │   │       (Refresca dados do servidor)
             │   │
             │   └─► ❌ Sem sessão
             │       appUser.set(null)
             │       Mostra: Landing/Login
             │
             └─► UI renderiza baseado em appUser()
                 - Autenticado → Dashboard
                 - Não autenticado → Landing
```

---

## 5️⃣ Fluxo de Admin (Com Validações Extras)

```
Usuário clica: Acesso Admin

┌──────────────┐
│ URL: /admin  │
└──────┬───────┘
       │
       └─► ROUTER VALIDA: canActivate: [adminGuard]
           │
           ├─► adminGuard executa
           │   │
           │   ├─ Verifica: appUser != null?
           │   │   ❌ NÃO → Redireciona /
           │   │   ✅ SIM → Continua
           │   │
           │   ├─ Verifica: user.role == 'admin'?
           │   │   ❌ NÃO → Redireciona /
           │   │   ✅ SIM → Continua
           │   │
           │   ├─ Verifica: user.status == 'Active'?
           │   │   ❌ NÃO → Redireciona /
           │   │   ✅ SIM → Continua
           │   │
           │   └─► ✅ Todas validações passaram
           │
           └─► Carrega AdminDashboardComponent
               Usuario tem acesso total a admin panel
```

---

## 6️⃣ Fluxo de Logout

```
Usuário clica: Logout

┌─────────────┐
│ Logout()    │
└──────┬──────┘
       │
       ├─► POST /api/logout (opcional, para destruir sessão server)
       │   └─► Server destrói session
       │
       ├─► Limpeza Local
       │   ├─ authService.appUser.set(null)
       │   ├─ authService.pendingEmailConfirmation.set(null)
       │   ├─ localStorage.clear()
       │   └─ dataService.clearData()
       │
       └─► Redireciona para: /
           Mostra: Landing/Login
           
Agora:
- appUser = null
- Todas as rotas protegidas bloqueadas
- localStorage vazio
```

---

## 7️⃣ Fluxo de Tentativa de Acesso Não Autorizado

```
Cenário: Profissional tenta acessar /admin

┌──────────────────────┐
│ URL: /admin          │
│ user.role: "prof"    │
└──────┬───────────────┘
       │
       └─► adminGuard valida
           │
           ├─ appUser != null? ✅ SIM
           ├─ role == 'admin'? ❌ NÃO (é 'professional')
           │
           └─► Redireciona para: /
               Console: "[AdminGuard] Usuário não é admin"
               UI: Mostra Dashboard do Profissional
```

---

## 8️⃣ Fluxo de Validação de Credenciais (Backend)

```
POST /api/login
{
  "email": "prof@test.com",
  "password": "senha123"
}

┌─────────────────────────────┐
│ Backend Recebe Requisição   │
└────────┬────────────────────┘
         │
         ├─► Validação 1: Email e Senha Obrigatórios?
         │   ✅ SIM → Continua
         │   ❌ NÃO → Retorna 400 "Email e senha obrigatórios"
         │
         ├─► Validação 2: Email Existe na DB?
         │   const { data } = await supabase
         │     .from('users')
         │     .select('*')
         │     .eq('email', email)
         │   ✅ SIM → Continua
         │   ❌ NÃO → Retorna 401 "Credenciais inválidas"
         │
         ├─► Validação 3: Hash de Senha Bate?
         │   const hash = SHA256(password)
         │   if (hash != user.password_hash) return 401
         │   ✅ MATCH → Continua
         │   ❌ NO MATCH → Retorna 401 "Credenciais inválidas"
         │
         └─► ✅ Validações Passaram
             Retorna 200 {
               "success": true,
               "user": { id, email, role, status, avatar_url, ... }
             }
```

---

## 9️⃣ Fluxo de Rate Limiting (A Implementar)

```
Usuário tenta fazer login 6 vezes seguidas

1️⃣ POST /api/login {email, password} → 401 ❌
2️⃣ POST /api/login {email, password} → 401 ❌
3️⃣ POST /api/login {email, password} → 401 ❌
4️⃣ POST /api/login {email, password} → 401 ❌
5️⃣ POST /api/login {email, password} → 401 ❌
6️⃣ POST /api/login {email, password} → ⚠️ BLOQUEADO
   Resposta: 429 "Muitas tentativas. Tente novamente em 15 min"

┌─────────────────────────────┐
│ Login Attempts Tracker      │
├─────────────────────────────┤
│ prof@test.com:              │
│  - Tentativas: 6            │
│  - Último acesso: 10:15:30  │
│  - Reset em: 10:30:30       │
│  - Bloqueado: ✅ SIM        │
└─────────────────────────────┘
```

---

## 🔟 Comparação: 3 Estados da Aplicação

### Estado 1: Não Autenticado
```
appUser = null
localStorage = {}

Acesso:
✅ / (Landing)
✅ /confirmar-email
✅ /reset-password
❌ /create-service-request (Bloqueado por authGuard)
❌ /admin (Bloqueado por adminGuard)
❌ /dashboard (Bloqueado por AppComponent effect)
```

### Estado 2: Autenticado (Profissional)
```
appUser = { id: 1, email: "prof@test.com", role: "professional", status: "Active" }
localStorage = { homeservice_user_session: {...} }

Acesso:
✅ / (Landing)
✅ /create-service-request (Liberado por authGuard)
✅ /dashboard (Liberado por AppComponent effect)
❌ /admin (Bloqueado por adminGuard - role != 'admin')
```

### Estado 3: Autenticado (Admin)
```
appUser = { id: 2, email: "admin@test.com", role: "admin", status: "Active" }
localStorage = { homeservice_user_session: {...} }

Acesso:
✅ / (Landing)
✅ /create-service-request (Liberado por authGuard)
✅ /admin (Liberado por adminGuard)
✅ /admin/requests
✅ /admin/professionals
```

---

## 🔐 Tabela de Decisão - Permitir Acesso?

| Condicção | Resultado | Ação |
|-----------|-----------|------|
| `appUser == null` | ❌ Bloqueado | Redireciona para / |
| `appUser != null && status != 'Active'` | ❌ Bloqueado | Redireciona para / |
| `appUser != null && route = '/admin' && role != 'admin'` | ❌ Bloqueado | Redireciona para / |
| `appUser != null && status == 'Active' && role == 'admin' && route = '/admin'` | ✅ Permitido | Carrega componente |
| `appUser != null && status == 'Active' && route = '/create-service-request'` | ✅ Permitido | Carrega componente |

---

## 📝 Legenda

| Símbolo | Significado |
|---------|------------|
| ✅ | Permitido / Seguro / Sucesso |
| ❌ | Bloqueado / Inseguro / Falha |
| ⚠️ | Aviso / Em Progresso |
| 🔴 | Crítico |
| 🟡 | Média Prioridade |
| 🟢 | Baixa Prioridade |

