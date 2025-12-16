# Guia de Implementação - Proteção de Rotas

## 🚀 Implementação Passo a Passo

Este documento mostra como corrigir as vulnerabilidades de segurança identificadas.

---

## Passo 1: Criar o Guarda de Autenticação

### Arquivo: `src/app/guards/auth.guard.ts`

```typescript
import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../../services/auth.service";

/**
 * Guarda de Autenticação Geral
 * Valida se o usuário está autenticado antes de acessar a rota
 *
 * Uso:
 * {
 *   path: 'protected-route',
 *   component: MyComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.appUser();

  console.log("[AuthGuard] Verificando autenticação:", {
    user: currentUser?.email,
    requestedUrl: state.url,
  });

  // Se não há usuário autenticado, redirecionar para landing
  if (!currentUser) {
    console.warn(
      "[AuthGuard] Usuário não autenticado. Redirecionando para login."
    );
    router.navigate(["/"], {
      queryParams: { returnUrl: state.url },
      state: { showLogin: true },
    });
    return false;
  }

  // Verificar se email foi confirmado
  if (currentUser.status === "Pending") {
    console.warn("[AuthGuard] Email não confirmado ainda.");
    router.navigate(["/"], {
      queryParams: { showVerification: true },
    });
    return false;
  }

  // Se status não é "Active", denegar acesso
  if (currentUser.status !== "Active") {
    console.warn(
      "[AuthGuard] Usuário não está ativo. Status:",
      currentUser.status
    );
    router.navigate(["/"]);
    return false;
  }

  console.log("[AuthGuard] Acesso permitido para:", currentUser.email);
  return true;
};
```

---

## Passo 2: Atualizar Rotas com o Guarda

### Arquivo: `src/app/app.routes.ts`

**ANTES (Inseguro):**

```typescript
export const routes: Routes = [
  {
    path: 'confirmar-email',
    component: EmailConfirmationComponent,
  },
  {
    path: 'reset-password',
    loadComponent: () => import('../components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'create-service-request',
    component: CreateServiceRequestComponent,  // ❌ SEM PROTEÇÃO
  },
  {
    path: 'admin-create-service-request',
    component: AdminCreateServiceRequestComponent,  // ❌ SEM PROTEÇÃO
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [...]
  },
];
```

**DEPOIS (Seguro):**

```typescript
import { Routes } from "@angular/router";
import { adminGuard } from "./guards/admin.guard";
import { authGuard } from "./guards/auth.guard"; // ← NOVO GUARDA

export const routes: Routes = [
  // Rotas Públicas (SEM AUTENTICAÇÃO)
  {
    path: "confirmar-email",
    component: EmailConfirmationComponent,
    // Sem canActivate = público
  },
  {
    path: "reset-password",
    loadComponent: () =>
      import("../components/reset-password/reset-password.component").then(
        (m) => m.ResetPasswordComponent
      ),
    // Sem canActivate = público
  },
  {
    path: "ui-components",
    component: UiComponentsShowcaseComponent,
    data: { title: "Componentes de UI" },
    // Sem canActivate = público
  },
  {
    path: "design-system",
    component: DesignSystemShowcaseComponent,
    data: { title: "Design System" },
    // Sem canActivate = público
  },

  // ✅ Rotas Protegidas (COM AUTENTICAÇÃO GERAL)
  {
    path: "create-service-request",
    component: CreateServiceRequestComponent,
    canActivate: [authGuard], // ← ADICIONADO
  },
  {
    path: "admin-create-service-request",
    component: AdminCreateServiceRequestComponent,
    canActivate: [authGuard], // ← ADICIONADO
  },

  // ✅ Rotas Protegidas (COM AUTENTICAÇÃO DE ADMIN)
  {
    path: "admin",
    component: AdminDashboardComponent,
    canActivate: [adminGuard], // Mais específico que authGuard
    children: [
      { path: "", redirectTo: "overview", pathMatch: "full" },
      {
        path: "overview",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/admin-overview/admin-overview.component"
          ).then((m) => m.AdminOverviewComponent),
      },
      {
        path: "requests",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/service-requests/service-requests.component"
          ).then((m) => m.ServiceRequestsComponent),
      },
      {
        path: "request-details/:id",
        loadComponent: () =>
          import(
            "../components/service-request-details/service-request-details.component"
          ).then((m) => m.ServiceRequestDetailsComponent),
      },
      {
        path: "service-request-edit/:id",
        loadComponent: () =>
          import(
            "../components/service-request-edit/service-request-edit.component"
          ).then((m) => m.ServiceRequestEditComponent),
      },
      {
        path: "approvals",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/pending-approvals/pending-approvals.component"
          ).then((m) => m.PendingApprovalsComponent),
      },
      {
        path: "finances",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/financial-reports/financial-reports.component"
          ).then((m) => m.FinancialReportsComponent),
      },
      {
        path: "professionals",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/professionals-management/professionals-management.component"
          ).then((m) => m.ProfessionalsManagementComponent),
      },
      {
        path: "professionals/edit/:id",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/professionals-management/professional-edit-page.component"
          ).then((m) => m.ProfessionalEditPageComponent),
      },
      {
        path: "clients",
        loadComponent: () =>
          import(
            "../components/admin-dashboard/users-management/users-management.component"
          ).then((m) => m.UsersManagementComponent),
      },
      {
        path: "categories",
        loadComponent: () =>
          import(
            "../components/category-management/category-management.component"
          ).then((m) => m.CategoryManagementComponent),
      },
    ],
  },
];
```

---

## Passo 3: Adicionar CSRF Protection no Backend

### Arquivo: `api/auth.js`

```javascript
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("node:crypto");
const serverlessExpress = require("@vendia/serverless-express");
const csrf = require("csurf"); // ← NOVO
const session = require("express-session"); // ← NOVO

require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ CSRF Protection Setup
const csrfProtection = csrf({ cookie: true });

// Session config
app.use(
  session({
    secret: process.env.SESSION_SECRET || "seu-secret-seguro",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS em produção
      sameSite: "strict",
    },
  })
);

const corsOptions = {
  origin: [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://localhost:4002",
    "http://127.0.0.1:4002",
    "https://home-service-nu.vercel.app",
    /^https:\/\/home-service-.*\.vercel\.app$/,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],
};
app.use(cors(corsOptions));

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://uqrvenlkquheajuveggv.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware de autenticação
const verifyAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  req.userId = req.session.userId;
  next();
};

// Rate limiting simples (implementar rate-limit-redis em produção)
const loginAttempts = new Map();
const checkRateLimit = (email) => {
  const attempts = loginAttempts.get(email) || {
    count: 0,
    resetTime: Date.now(),
  };
  const now = Date.now();

  if (now - attempts.resetTime > 15 * 60 * 1000) {
    // Reset a cada 15 minutos
    attempts.count = 0;
    attempts.resetTime = now;
  }

  if (attempts.count >= 5) {
    // Máximo 5 tentativas
    return false;
  }

  attempts.count++;
  loginAttempts.set(email, attempts);
  return true;
};

app.post("/api/register", async (req, res) => {
  const { name, email, phone, specialty, password, role, status } = req.body;

  if (!email) return res.status(400).json({ error: "Email obrigatório." });
  if (!password) return res.status(400).json({ error: "Senha obrigatória." });
  if (password.length < 8)
    return res
      .status(400)
      .json({ error: "Senha deve ter mínimo 8 caracteres." });

  try {
    const tempPassword = password;
    const hash = crypto.createHash("sha256").update(tempPassword).digest("hex");

    const { error } = await supabase.from("users").insert({
      name,
      email,
      password_hash: hash,
      phone,
      specialty,
      role: role || "professional",
      status: status || "Pending",
    });

    if (error) throw error;

    console.log("✅ Usuário registrado:", email);
    res.json({ success: true, message: "Usuário registrado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ LOGIN COM PROTEÇÃO
app.post("/api/login", csrfProtection, async (req, res) => {
  const { email, password } = req.body;

  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatórios." });
  }

  // ✅ Rate limiting
  if (!checkRateLimit(email)) {
    console.warn("⚠️ Muitas tentativas de login para:", email);
    return res.status(429).json({
      error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    });
  }

  try {
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password_hash", hash)
      .single();

    if (error || !data) {
      console.warn("⚠️ Login falhado para:", email);
      // Log audit
      await supabase.from("audit_log").insert({
        action: "LOGIN_FAILED",
        email: email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // ✅ Criar sessão
    req.session.userId = data.id;
    req.session.email = data.email;
    req.session.role = data.role;

    // Log audit
    await supabase.from("audit_log").insert({
      action: "LOGIN_SUCCESS",
      user_id: data.id,
      email: data.email,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Login bem-sucedido para:", email);
    res.json({ success: true, user: data });
  } catch (err) {
    console.error("❌ Erro ao fazer login:", err.message);
    res.status(500).json({ error: "Erro ao processar login." });
  }
});

// ✅ CHANGE PASSWORD COM PROTEÇÃO
app.post(
  "/api/change-password",
  verifyAuth,
  csrfProtection,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "A nova senha deve ter pelo menos 8 caracteres." });
    }

    try {
      const currentHash = crypto
        .createHash("sha256")
        .update(currentPassword)
        .digest("hex");
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .eq("password_hash", currentHash)
        .single();

      if (fetchError || !user) {
        return res.status(401).json({ error: "Senha atual incorreta." });
      }

      const newHash = crypto
        .createHash("sha256")
        .update(newPassword)
        .digest("hex");
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: newHash })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      console.log("✅ Senha alterada para:", user.email);
      res.json({ success: true, message: "Senha alterada com sucesso." });
    } catch (err) {
      console.error("❌ Erro ao alterar senha:", err.message);
      res.status(500).json({ error: "Erro ao alterar senha." });
    }
  }
);

// ✅ LOGOUT
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao fazer logout." });
    }
    res.json({ success: true, message: "Logout bem-sucedido." });
  });
});

module.exports = app;
```

---

## Passo 4: Atualizar Auth Service para Usar Novos Recursos

### Arquivo: `src/services/auth.service.ts` (Adições)

```typescript
// Adicionar ao AuthService

/**
 * Logout limpa sessão completamente
 */
async logout(): Promise<void> {
  try {
    // Chamar backend para destruir sessão
    await fetch(`${environment.loginApiUrl.replace('/api/login', '/api/logout')}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("Erro ao fazer logout:", err);
  } finally {
    // Limpar dados locais
    this.appUser.set(null);
    this.pendingEmailConfirmation.set(null);
    localStorage.removeItem("homeservice_user_session");
    this.dataService.clearData();
    console.log("✅ Usuário fez logout");
  }
}

/**
 * Validar se a sessão ainda é válida no servidor
 */
private async validateSessionOnServer(userId: number): Promise<boolean> {
  try {
    const response = await fetch(`${environment.apiBaseUrl}/api/validate-session`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    return response.ok;
  } catch (err) {
    console.error("Erro ao validar sessão:", err);
    return false;
  }
}
```

---

## Passo 5: Testar Segurança

### Testes Manual

```bash
# ❌ Teste 1: Sem autenticação, tentar acessar rota protegida
curl http://localhost:4200/create-service-request
# Resultado esperado: Redirecionamento para login

# ❌ Teste 2: Credenciais inválidas
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "wrongpassword"}'
# Resultado esperado: { "error": "Credenciais inválidas." }

# ✅ Teste 3: Credenciais válidas
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "valid@test.com", "password": "correctpassword123"}'
# Resultado esperado: { "success": true, "user": {...} }

# ⚠️ Teste 4: Rate limiting
# Fazer 6+ tentativas seguidas
# Resultado esperado: { "error": "Muitas tentativas de login..." }
```

### Testes Automatizados

```typescript
// security.spec.ts
describe("Segurança - Proteção de Rotas", () => {
  it("deve redirecionar para login quando usuário não autenticado", () => {
    // Limpar localStorage
    localStorage.clear();

    // Tentar acessar rota protegida
    const router = TestBed.inject(Router);
    router.navigate(["/create-service-request"]);

    // Verificar que foi redirecionado
    expect(router.url).toBe("/");
  });

  it("deve permitir acesso para usuário autenticado", () => {
    const authService = TestBed.inject(AuthService);
    const mockUser = {
      id: 1,
      email: "test@test.com",
      role: "professional",
      status: "Active",
    };

    authService.appUser.set(mockUser);

    const router = TestBed.inject(Router);
    router.navigate(["/create-service-request"]);

    // Deve permitir acesso
    expect(router.url).toBe("/create-service-request");
  });
});
```

---

## 📋 Checklist de Implementação

- [ ] Criar `src/app/guards/auth.guard.ts`
- [ ] Atualizar `src/app/app.routes.ts` com `authGuard`
- [ ] Adicionar CSRF protection em `api/auth.js`
- [ ] Implementar rate limiting
- [ ] Adicionar `logout()` method
- [ ] Adicionar validação de sessão no servidor
- [ ] Testes manuais em ambiente local
- [ ] Testes em staging
- [ ] Deploy em produção
- [ ] Monitorar logs de segurança

---

## 🚀 Próximos Passos Opcionais

1. **JWT Token** - Substituir sessionId por JWT signed
2. **2FA** - Two-factor authentication
3. **Rate Limiting Redis** - Distribuído para múltiplos servidores
4. **API Keys** - Para acesso programático
5. **OAuth** - Integração com Google/Microsoft
