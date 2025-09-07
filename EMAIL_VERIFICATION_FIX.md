# Correção do Fluxo de Verificação de E-mail

## Problema Identificado

Antes da correção, quando um usuário se registrava na aplicação:

1. ✅ Dados eram enviados corretamente
2. ❌ Usuário era automaticamente logado no sistema
3. ❌ Acessava o dashboard sem confirmar o e-mail
4. ❌ Não havia validação de e-mail confirmado

## Solução Implementada

### 1. **Modificações no AuthService**

#### Nova Propriedade

```typescript
readonly pendingEmailConfirmation = signal<string | null>(null);
```

- Rastreia usuários que precisam confirmar e-mail

#### Verificação de E-mail Confirmado

```typescript
private async fetchAppUser(userId: string) {
  // Verificar se o usuário confirmou o e-mail
  const { data: supabaseUser } = await this.supabase.client.auth.getUser();
  if (supabaseUser.user && !supabaseUser.user.email_confirmed_at) {
    this.appUser.set(null);
    return;
  }
  // ... continua só se e-mail confirmado
}
```

#### Detecção Automática de Usuários Não Confirmados

```typescript
constructor() {
  effect(async () => {
    const sUser = this.supabaseUser();
    if (sUser) {
      if (!sUser.email_confirmed_at) {
        // Usuário existe mas e-mail não confirmado
        this.pendingEmailConfirmation.set(sUser.email || null);
        this.appUser.set(null);
      } else {
        // E-mail confirmado, buscar perfil
        this.pendingEmailConfirmation.set(null);
        await this.fetchAppUser(sUser.id);
      }
    }
  });
}
```

#### Logout Após Registro

```typescript
async register(...) {
  // Após criar usuário na base
  if (signUpData.user) {
    // Criar perfil...

    // Fazer logout para forçar verificação
    await this.supabase.client.auth.signOut();

    // Definir e-mail pendente
    this.pendingEmailConfirmation.set(email);
  }
}
```

#### Método para Reenvio de Código

```typescript
async resendVerificationCode(email: string): Promise<void> {
  const { error } = await this.supabase.client.auth.resend({
    type: 'signup',
    email: email,
  });
  // ... tratamento de erro
}
```

### 2. **Modificações no AppComponent**

#### Nova Propriedade

```typescript
pendingEmailConfirmation = this.authService.pendingEmailConfirmation;
```

#### Lógica de Navegação Atualizada

```typescript
constructor() {
  effect(() => {
    const user = this.currentUser();
    const pendingEmail = this.pendingEmailConfirmation();

    if (pendingEmail) {
      // Usuário precisa confirmar e-mail
      this.emailForVerification.set(pendingEmail);
      this.view.set("verification");
    } else if (user) {
      // Usuário confirmado, acessar app
      this.view.set("app");
    } else {
      // Nenhum usuário
      this.view.set("landing");
    }
  });
}
```

#### Processo de Registro Simplificado

```typescript
handleRegister(payload: RegisterPayload) {
  this.authService.register(
    payload.name,
    payload.email,
    payload.password,
    payload.role
  );
  // O AuthService automaticamente define o estado
}
```

#### Verificação Atualizada

```typescript
handleVerification(code: string) {
  this.authService.verifyOtp(this.emailForVerification(), code).then((response) => {
    if (!response.error) {
      this.notificationService.addNotification(
        "Verification successful! You can now access the application."
      );

      // Limpar estado pendente
      this.authService.pendingEmailConfirmation.set(null);
    }
  });
}
```

#### Reenvio de Código

```typescript
handleResendVerification() {
  const email = this.emailForVerification();
  if (email) {
    this.authService.resendVerificationCode(email);
  }
}
```

## Fluxo Atual

### 1. **Registro do Usuário**

1. Usuário preenche formulário de registro
2. Dados são enviados para Supabase
3. Perfil é criado na tabela `users`
4. **Logout automático** é executado
5. Estado `pendingEmailConfirmation` é definido
6. Usuário é redirecionado para tela de verificação

### 2. **Tela de Verificação**

1. Mostra mensagem: "Um código foi enviado para seu e-mail"
2. Campo para inserir código de 6 dígitos
3. Botão "Verificar"
4. Link "Reenviar código"

### 3. **Após Confirmação**

1. Código é validado
2. E-mail é marcado como confirmado no Supabase
3. Estado `pendingEmailConfirmation` é limpo
4. Usuário é automaticamente redirecionado para o dashboard

## Benefícios

✅ **Segurança**: Usuários só acessam após confirmação de e-mail  
✅ **UX Melhorada**: Feedback claro sobre o processo  
✅ **Conformidade**: Garante e-mails válidos  
✅ **Automático**: Detecção inteligente de estados  
✅ **Reenvio**: Usuário pode solicitar novo código

## Configuração Necessária

Para que isso funcione corretamente, certifique-se de que:

1. **SMTP está configurado** no Supabase com Mailtrap
2. **Email confirmation está HABILITADO** no painel do Supabase
3. **Template de e-mail** está configurado corretamente

### Verificar Configuração no Supabase

1. Vá para **Authentication** → **Settings**
2. Em **User signups**, marque **Enable email confirmations**
3. Em **SMTP Settings**, configure o Mailtrap
4. Em **Email Templates**, personalize se necessário

## Testando

Para testar se está funcionando:

1. Registre um novo usuário
2. ✅ Deve ser redirecionado para tela de verificação
3. ✅ E-mail deve chegar no Mailtrap
4. ✅ Inserir código deve dar acesso ao sistema
5. ✅ Tentar acessar sem confirmação deve bloquear
