# Análise de Segurança - Proteção de Rotas e Autenticação

## 📋 Resumo Executivo

**Resposta às suas perguntas:**
- ❌ **NÃO é possível acessar com senha inválida** - Validação no backend rejeita credenciais incorretas
- ⚠️ **NÃO todas as URLs precisam de senha** - Há um problema de segurança: rotas desprotegidas são acessíveis sem autenticação
- 🔴 **RISCO CRÍTICO IDENTIFICADO** - Várias rotas podem ser acessadas sem autenticação

---

## 🔐 Estado Atual da Autenticação

### 1. Validação de Credenciais (SEGURO ✅)

**Backend - `/api/login` (auth.js:60-73)**
```javascript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  // ✅ Valida email obrigatório
  if (!email || !password) 
    return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  
  // ✅ Cria hash SHA256 da senha
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  
  // ✅ Consulta no banco comparando hash
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', hash)
    .single();
  
  // ✅ Rejeita se não encontrar match
  if (error || !data) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  
  res.json({ success: true, user: data });
});
```

**Frontend - Validação (login.component.ts:211-244)**
```typescript
login() {
  // ✅ Valida email
  if (!this.validateEmail()) {
    this.errorMessage.set('invalidEmail');
    return;
  }
  
  // ✅ Valida senha (mínimo 6 caracteres)
  if (!this.validatePassword()) {
    this.errorMessage.set('invalidPassword');
    return;
  }
  
  // ✅ Chamada para backend com credenciais
  this.authService.loginCustom(this.email(), this.password())
    .then((user) => {
      if (user) {
        this.switchView.emit({ type: 'dashboard', payload: null });
      } else {
        this.errorMessage.set('Credenciais inválidas ou erro de autenticação.');
      }
    });
}
```

**Resultado: ✅ SEGURO - Senha inválida rejeita login**

---

## 🚨 Rotas DESPROTEGIDAS (Sem Autenticação Obrigatória)

### Rotas Públicas (Corretas - Sem Proteção Necessária)
```
/                          → Landing Page
/confirmar-email           → Confirmação de Email
/reset-password            → Reset de Senha
/ui-components             → Vitrine de Componentes
/design-system             → Design System
/create-service-request    → Criar Solicitação
/admin-create-service-request → Admin criar Solicitação
```

### ⚠️ PROBLEMA: Falta de Guarda de Autenticação Geral

**Situação Atual:**
```typescript
// ✅ Guarda APENAS na rota /admin
{
  path: 'admin',
  component: AdminDashboardComponent,
  canActivate: [adminGuard],  // ← Só aqui
  children: [...]
}

// ❌ Rotas desprotegidas (sem canActivate)
{
  path: 'create-service-request',
  component: CreateServiceRequestComponent,  // ← Sem proteção!
},
{
  path: 'admin-create-service-request',
  component: AdminCreateServiceRequestComponent,  // ← Sem proteção!
}
```

**Fluxo de Acesso Não Autenticado:**
```
1. Usuário acessa http://app.com/create-service-request sem login
2. Router carrega CreateServiceRequestComponent
3. Componente tenta acessar authService.appUser() 
4. Se vazio → Pode causar erro ou comportamento indefinido
```

---

## 🔄 Proteção em Tempo de Execução (Parcial)

### App Component (app.component.ts:240-285)

A aplicação **tenta proteger** em tempo de execução, mas **NÃO no roteamento**:

```typescript
effect(() => {
  const user = this.currentUser();
  const pendingEmail = this.pendingEmailConfirmation();

  if (pendingEmail) {
    this.view.set("verification");  // Email pendente
  } else if (user) {
    if (user.status === "Active") {
      this.view.set("app");  // Usuário autenticado
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);  // Redireciona admin
      }
    }
  } else {
    this.view.set("landing");  // Sem usuário = landing
    this.dataService.clearData();
  }
});
```

**Problema:** 
- Essa proteção é **reativa**, não preventiva
- Usuário pode acessar rotas antes do effect executar
- Não há guarda de rota verificando autenticação ANTES do componente carregar

---

## 🔴 Vulnerabilidades Identificadas

### 1. Rotas Sem Guarda de Autenticação
**Severidade:** 🔴 CRÍTICA
- `/create-service-request` - Acessível sem login
- `/admin-create-service-request` - Acessível sem login
- Router outlet em app.component.html - Pode renderizar conteúdo não autorizado

**Impacto:**
```
- Usuário não autenticado acessa: http://app.com/create-service-request
- Componente carrega mesmo sem appUser
- Pode exibir UI ou fazer requisições sem autenticação
- Potencial vazamento de dados
```

### 2. Falta de Verificação no Bootstrap
**Severidade:** 🟡 MÉDIA
- `restoreSessionFromStorage()` é chamado, mas há delay
- Janela de tempo onde usuário não autenticado pode navegar
- localStorage pode ser manipulado

### 3. Recuperação de Sessão Vulnerável
**Severidade:** 🟡 MÉDIA
```typescript
// Em auth.service.ts:61-79
async restoreSessionFromStorage(): Promise<void> {
  const sessionData = localStorage.getItem("homeservice_user_session");
  if (sessionData) {
    const user = JSON.parse(sessionData);  // ⚠️ Confia no localStorage
    this.appUser.set(user);  // ⚠️ Sem validar no servidor
  }
}
```

**Risco:** localStorage é acessível a scripts - se XSS acontecer, sessão comprometida

### 4. Sem CSRF Protection
**Severidade:** 🟡 MÉDIA
- `/api/login` aceita POST sem verificação de CSRF token
- `/api/change-password` também sem proteção

---

## ✅ Pontos SEGUROS

1. **Senha com Hash SHA256** - Não armazenada em plain text
2. **Validação de Email Obrigatória** - Só usuários com email confirmado podem fazer login
3. **Status de Usuário Verificado** - Apenas usuários "Active" podem acessar dashboard
4. **Guarda de Admin** - `/admin` está protegido por `adminGuard`
5. **Logout Limpa Session** - localStorage é limpo no logout

---

## 🛠️ Recomendações de Segurança

### CRÍTICA (Implementar IMEDIATAMENTE)

#### 1. Criar Guarda de Autenticação Geral
```typescript
// src/app/guards/auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.appUser();
  
  if (!currentUser) {
    console.warn('[AuthGuard] Usuário não autenticado. Redirecionando para login.');
    router.navigate(['/'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
  
  return true;
};
```

#### 2. Proteger Rotas que Exigem Autenticação
```typescript
// src/app/app.routes.ts
export const routes: Routes = [
  // Rotas Públicas (sem proteção)
  { path: '', component: LandingComponent },
  { path: 'confirmar-email', component: EmailConfirmationComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  // ✅ Rotas Protegidas (COM GUARDA)
  {
    path: 'create-service-request',
    component: CreateServiceRequestComponent,
    canActivate: [authGuard]  // ← ADICIONAR
  },
  {
    path: 'admin-create-service-request',
    component: AdminCreateServiceRequestComponent,
    canActivate: [authGuard]  // ← ADICIONAR
  },
  
  // Admin (já protegido)
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard]
  }
];
```

#### 3. Validar Sessão no Servidor
```javascript
// Middleware para proteger rotas
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verificar token JWT/sessão no servidor
  try {
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### MÉDIA (Implementar em Sprint Próximo)

#### 1. Adicionar CSRF Protection
```javascript
const csrf = require('csurf');
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  httpOnly: true,
  secure: true // HTTPS apenas
}));

app.use(csrf());
app.post('/api/login', csrf(), (req, res) => { /* ... */ });
```

#### 2. Implementar JWT em vez de localStorage simples
```javascript
// Backend
const jwt = require('jsonwebtoken');

if (res.ok && result.success && user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({ 
    success: true, 
    user: data,
    token: token  // ← Enviar JWT
  });
}
```

#### 3. Validar Sessão ao Restaurar
```typescript
// auth.service.ts
async restoreSessionFromStorage(): Promise<void> {
  const sessionData = localStorage.getItem("homeservice_user_session");
  if (sessionData) {
    const user = JSON.parse(sessionData);
    
    // ✅ Validar no servidor que sessão ainda é válida
    try {
      const isValid = await this.validateSessionOnServer(user.id);
      if (isValid) {
        this.appUser.set(user);
      } else {
        localStorage.removeItem("homeservice_user_session");
        this.appUser.set(null);
      }
    } catch (err) {
      this.appUser.set(null);
    }
  }
}
```

#### 4. HTTPS Obrigatório
```javascript
// Redirecionar HTTP para HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### BAIXA (Nice-to-have)

1. Implementar Rate Limiting no `/api/login`
2. Adicionar 2FA (Two-Factor Authentication)
3. Implementar Session Timeout (15-30 minutos)
4. Adicionar audit logging para tentativas de login falhadas
5. Implementar SameSite cookie protection

---

## 📊 Tabela de Segurança de Rotas

| Rota | Componente | Autenticação | Guarda | Status |
|------|-----------|--------------|--------|--------|
| `/` | Landing | ❌ Não | ❌ Não | ✅ OK |
| `/confirmar-email` | EmailConfirmation | ❌ Não | ❌ Não | ✅ OK |
| `/reset-password` | ResetPassword | ❌ Não | ❌ Não | ✅ OK |
| `/create-service-request` | CreateServiceRequest | ✅ Sim | ❌ **NÃO** | 🔴 **INSEGURO** |
| `/admin-create-service-request` | AdminCreateServiceRequest | ✅ Sim | ❌ **NÃO** | 🔴 **INSEGURO** |
| `/admin/*` | AdminDashboard | ✅ Sim | ✅ adminGuard | ✅ Seguro |
| `/ui-components` | UiComponentsShowcase | ❌ Não | ❌ Não | ✅ OK |
| `/design-system` | DesignSystemShowcase | ❌ Não | ❌ Não | ✅ OK |

---

## 🎯 Próximos Passos

1. **HOJE**: Criar `authGuard` e aplicar em rotas protegidas
2. **ESTA SEMANA**: Implementar CSRF protection no backend
3. **PRÓXIMAS 2 SEMANAS**: Migrar para JWT com validação de servidor
4. **PRÓXIMO MÊS**: Implementar 2FA e rate limiting

---

## 📝 Conclusão

A aplicação tem **validação básica de credenciais**, mas **falta proteção em nível de rota**. Um usuário consegue navegar para URLs protegidas antes do sistema impedir, criando uma **janela de vulnerabilidade**. 

**Recomendação Urgente:** Implementar `authGuard` nas 2 rotas desprotegidas identificadas.
