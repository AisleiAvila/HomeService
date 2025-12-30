import { effect, inject, Injectable, signal } from "@angular/core";
import { User, UserRole } from "../models/maintenance.models";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { AuthError, AuthResponse } from "@supabase/supabase-js";

import { environment } from "../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AuthService {
      private readonly notificationService = inject(NotificationService);
    private readonly supabase = inject(SupabaseService);
    private readonly supabaseUser = this.supabase.currentUser;
    readonly appUser = signal<User | null>(null);
    readonly pendingEmailConfirmation = signal<string | null>(null);

  private readonly sessionStorageKey = "homeservice_session";
  private sessionExpiryTimer: number | null = null;

  private readStoredSession(): { token: string; expiresAt: string; user?: User } | null {
    try {
      const raw = sessionStorage.getItem(this.sessionStorageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private writeStoredSession(session: { token: string; expiresAt: string; user: User }): void {
    sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(session));
  }

  private clearStoredSession(): void {
    sessionStorage.removeItem(this.sessionStorageKey);
  }

  private scheduleAutoLogout(expiresAtIso: string): void {
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }

    const ms = new Date(expiresAtIso).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) {
      // already expired
      queueMicrotask(() => void this.logout());
      return;
    }

    this.sessionExpiryTimer = window.setTimeout(() => {
      void this.logout();
    }, ms);
  }

  private revokeSessionOnExit(): void {
    const stored = this.readStoredSession();
    if (!stored?.token) return;

    const payload = JSON.stringify({ action: "revoke", token: stored.token, reason: "exit" });
    const url = environment.sessionApiUrl;

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch {
      // best-effort
    }
  }
  /**
   * Login customizado via backend próprio
   */
  async loginCustom(email: string, password: string): Promise<User | null> {
    try {
      const res = await fetch(`${environment.loginApiUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      // Aceita apenas autenticação via backend próprio
      const user = result.user as User | undefined;
      const session = result.session as { token: string; expiresAt: string } | undefined;
      if (res.ok && result.success && user && session?.token && session?.expiresAt) {
        this.appUser.set(user);
        this.writeStoredSession({ token: session.token, expiresAt: session.expiresAt, user });
        this.scheduleAutoLogout(session.expiresAt);
        console.log("✅ Usuário autenticado e sessão salva:", user.email);
        console.log("📷 Avatar URL recebido do backend:", user.avatar_url);
        console.log("👤 Nome recebido do backend:", user.name);
        return user;
      } else {
        this.notificationService.addNotification(result.error || 'Credenciais inválidas');
        return null;
      }
    } catch (err) {
      console.error("Erro ao conectar ao servidor de login:", err);
      this.notificationService.addNotification('Erro ao conectar ao servidor de login.');
      return null;
    }
  }

  /**
   * Recupera a sessão do usuário do sessionStorage no bootstrap
   * (sessionStorage invalida automaticamente ao fechar a aba/app)
   */
  async restoreSessionFromStorage(): Promise<void> {
    try {
      // Limpar formato legado (sem token)
      localStorage.removeItem("homeservice_user_session");

      const stored = this.readStoredSession();
      if (!stored?.token || !stored?.expiresAt) {
        console.log("ℹ️ Nenhuma sessão encontrada no sessionStorage");
        this.appUser.set(null);
        return;
      }

      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        console.log("⏰ Sessão expirada (sessionStorage)");
        this.clearStoredSession();
        this.appUser.set(null);
        return;
      }

      // Validar sessão no backend para garantir revogação/expiração server-side
      const validateRes = await fetch(environment.sessionApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${stored.token}`,
        },
        body: JSON.stringify({ action: "validate" }),
      });

      const validateJson = await validateRes.json().catch(() => ({}));
      if (!validateRes.ok || !validateJson.success || !validateJson.user) {
        console.log("ℹ️ Sessão inválida no servidor; limpando");
        this.clearStoredSession();
        this.appUser.set(null);
        return;
      }

      const user = validateJson.user as User;
      const expiresAt = validateJson.session?.expiresAt || stored.expiresAt;

      this.appUser.set(user);
      this.writeStoredSession({ token: stored.token, expiresAt, user });
      this.scheduleAutoLogout(expiresAt);

      console.log("🔄 Sessão validada e restaurada:", user.email);

      // Refrescar os dados do usuário (avatar etc.)
      console.log("🔄 Refrescando dados do perfil do servidor...");
      await this.refreshAppUser(user.email);
    } catch (err) {
      console.error("❌ Erro ao recuperar sessão do localStorage:", err);
      this.clearStoredSession();
      this.appUser.set(null);
    }
  }
  async confirmEmailCustom(email: string, token: string): Promise<boolean> {
    try {
      const res = await fetch(`${environment.confirmEmailApiUrl}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token })
      });
      const result = await res.json();
      if (result.success) {
        this.notificationService.addNotification("E-mail confirmado com sucesso!");
        return true;
      } else {
        this.notificationService.addNotification(result.message || "Falha ao confirmar e-mail.");
        return false;
      }
    } catch (e) {
      console.error("Erro ao conectar ao servidor de confirmação:", e);
      this.notificationService.addNotification("Erro ao conectar ao servidor de confirmação.");
      return false;
    }
  }
  /**
   * Recarrega o perfil do usuário autenticado (público)
   */
  async refreshAppUser(userId: string): Promise<void> {
    await this.fetchAppUser(userId, false);
  }

  /**
   * Busca o perfil do usuário autenticado na tabela 'users'
   * @param userId ID do usuário na tabela users
   * @param isAutomatic Indica se a chamada é automática (ex: via effect)
   */
  private async fetchAppUser(userId: string, isAutomatic: boolean): Promise<void> {
    try {
      // Buscar perfil completo incluindo avatar_url, name e outras informações
      const { data: user, error } = await this.supabase.client
        .from("users")
        .select("*")
        .eq("email", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar perfil do usuário:", error);
        this.appUser.set(null);
        return;
      }

      if (!user) {
        const message = "Perfil não encontrado para o usuário. Verifique se o cadastro está correto.";
        console.warn("⚠️", message);
        // Apenas mostrar notificação se não for uma chamada automática
        if (!isAutomatic) {
          this.notificationService.addNotification(message);
        }
        this.appUser.set(null);
        return;
      }

      // Definir usuário na signal apenas com email e role
      this.pendingEmailConfirmation.set(null);
      this.appUser.set(user as User);
      console.log("✅ Perfil do usuário carregado com sucesso:", user.email);
      console.log("📷 Avatar URL:", user.avatar_url);
      console.log("👤 Nome:", user.name);
    } catch (err) {
      console.error("❌ Erro inesperado ao buscar perfil do usuário:", err);
      this.appUser.set(null);
    }
  }


  constructor() {
    // AuthService agora usa autenticação customizada (não Supabase Auth)
    // A sessão é restaurada via restoreSessionFromStorage() chamado no bootstrap
    console.log("✅ AuthService inicializado (autenticação customizada)");

    // Best-effort: revogar sessão ao fechar aba/app
    window.addEventListener("pagehide", () => this.revokeSessionOnExit());
    window.addEventListener("beforeunload", () => this.revokeSessionOnExit());
  }

  private async handleUnverifiedEmail(
    user: User,
    userId: string,
    isAutomatic: boolean
  ): Promise<void> {
    console.log("⚠️ Email NÃO verificado na tabela users.");
    console.log("🔍 Verificando confirmação no Supabase...");

    const { data: supabaseUser, error: supabaseError } =
      await this.supabase.client.auth.getUser();

    if (!supabaseError && supabaseUser.user?.email_confirmed_at) {
      await this.syncEmailVerification(user, userId);
    } else {
      await this.handleEmailNotConfirmed(user, isAutomatic);
    }
  }

  private async syncEmailVerification(
    user: User,
    userId: string
  ): Promise<void> {
    console.log("✅ Email confirmado no Supabase! Atualizando tabela users...");

    const { error: updateError } = await this.supabase.client
      .from("users")
      .update({ email_verified: true })
      .eq("id", userId);

    if (updateError) {
      console.error("❌ Erro ao atualizar email_verified:", updateError);
    } else {
      console.log("✅ Campo email_verified atualizado com sucesso");
      user.email_verified = true;
      this.pendingEmailConfirmation.set(null);
      this.appUser.set(user);
    }
  }

  private async handleEmailNotConfirmed(
    user: User,
    isAutomatic: boolean
  ): Promise<void> {
    console.log("❌ Email ainda não confirmado no Supabase");

    if (isAutomatic) {
      console.log("🔄 Chamada automática - fazendo logout silencioso");
      await this.supabase.client.auth.signOut();
      this.appUser.set(null);
    } else {
      console.log("📧 Chamada manual - redirecionando para verificação");
      this.pendingEmailConfirmation.set(user.email);
      this.appUser.set(null);
      await this.supabase.client.auth.signOut();
    }
  }

  private handleAuthError(
    error: AuthError | { message: string } | null,
    context: string
  ) {
    if (error) {
      console.error(`Error ${context}:`, error.message);
      this.notificationService.addNotification(`Error: ${error.message}`);
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Login iniciado

    try {
      // Validação básica
      if (!email || !password) {
        throw new Error("Email e senha são obrigatórios");
      }

      // Chamando signInWithPassword

      const response = await this.supabase.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Resposta do signInWithPassword recebida

      if (response.error) {
        // Erro detalhado
        this.handleAuthError(response.error, "logging in");
        return response;
      }

      // Se login foi bem-sucedido, verificar se email foi verificado
      if (response.data?.user) {
        // Login bem-sucedido, verificando email_verified

        const { data: userData, error: userError } = await this.supabase.client
          .from("users")
          .select("email_verified")
          .eq("id", response.data.user.id)
          .single();

        if (userError) {
          // Erro ao verificar email_verified
        } else if (userData?.email_verified) {
          // Email verificado, login permitido
        } else {
          // Email não verificado, bloqueando login

          await this.supabase.client.auth.signOut();

          // Mostrar notificação de erro na tela de login
          this.notificationService.addNotification(
            "Email não verificado. Por favor, verifique seu email e clique no link de verificação antes de fazer login."
          );

          // Retornar erro personalizado para ser tratado pelo componente de login
          return {
            data: { user: null, session: null },
            error: {
              message:
                "Email não verificado. Por favor, verifique seu email e clique no link de verificação antes de fazer login.",
              name: "EmailNotVerified",
              status: 400,
            } as AuthError,
          };
        }
      }

      return response;
    } catch (error) {
      // Erro inesperado no login
      const authError = error as AuthError;
      this.handleAuthError(authError, "logging in");

      return {
        data: { user: null, session: null },
        error: authError,
      };
    }
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<void> {
    console.log("🚀 AuthService.register() iniciado para:", email);
    console.log("🎯 SOLUÇÃO ALTERNATIVA: Usando OTP em vez de signUp");
    console.log("🎯 Role recebido como parâmetro:", role);

    // Validar formato do e-mail antes de qualquer operação
    console.log("✅ Validando formato do e-mail...");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("❌ Formato de e-mail inválido:", email);
      this.notificationService.addNotification(
        "Por favor, insira um e-mail válido (exemplo: usuario@email.com)"
      );
      return;
    }

    // Verificar se já existe um usuário com este e-mail na nossa tabela via fetch puro
    console.log("🔍 Verificando se e-mail já existe na base de dados...");
    // Usar variáveis de ambiente diretamente
    const supabaseUrl = environment.supabaseRestUrl;
    const supabaseKey = environment.supabaseAnonKey;
    const checkRes = await fetch(`${supabaseUrl}/users?select=email&email=eq.${email}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'accept-profile': 'public'
      }
    });
    if (checkRes.ok) {
      const existsArr = await checkRes.json();
      if (Array.isArray(existsArr) && existsArr.length > 0) {
        console.log("⚠️ E-mail já existe na tabela users");
        this.notificationService.addNotification(
          "E-mail já cadastrado. Tente fazer login ou use outro e-mail."
        );
        return;
      }
    } else {
      let errText = await checkRes.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch {
        errJson = { message: errText };
      }
      console.error('Erro Supabase GET:', errJson);
    }

    // Novo fluxo: cadastro direto na tabela users e envio de e-mail customizado
    // Gerar um token de confirmação simples (pode ser JWT, UUID, ou string aleatória)
    const confirmationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Inserir profissional na tabela users
    const insertData = {
      name,
      email,
      role,
      status: role === "professional" ? "Pending" : "Active",
      avatar_url: `https://i.pravatar.cc/150?u=${email}`,
      email_verified: false,
      confirmation_token: confirmationToken,
    };
    const { error: insertError } = await this.supabase.client
      .from("users")
      .insert(insertData);
    if (insertError) {
      console.error("❌ Erro ao criar registro na tabela users:", insertError);
      this.notificationService.addNotification("Erro ao cadastrar profissional. Tente novamente.");
      return;
    }

    // Enviar e-mail de confirmação customizado
    const confirmUrl = `https://home-service-nu.vercel.app/confirm?email=${encodeURIComponent(email)}&token=${confirmationToken}`;
    try {
      await fetch("http://localhost:4001/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Confirmação de cadastro - HomeService",
          html: `<p>Olá ${name},</p><p>Seu cadastro como profissional foi realizado com sucesso.<br>Por favor, confirme seu e-mail clicando no link abaixo:</p><p><a href='${confirmUrl}'>Confirmar e-mail</a></p>`
        })
      });
      this.notificationService.addNotification(
        "✅ Cadastro realizado! Um e-mail de confirmação foi enviado para o profissional. Verifique a caixa de entrada e spam."
      );
    } catch (e) {
      console.error("❌ Erro ao enviar e-mail de confirmação:", e);
      this.notificationService.addNotification("Cadastro realizado, mas falha ao enviar e-mail de confirmação.");
    }
  }

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    console.log("🔍 Verificando OTP para:", email);

    const response = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (response.error) {
      this.handleAuthError(response.error, "verifying OTP");
      return response;
    }

    if (response.data.user) {
      console.log("✅ OTP verificado com sucesso!");
      await this.handleSuccessfulOtpVerification(response.data.user);
    }

    return response;
  }

  private async handleSuccessfulOtpVerification(user: any): Promise<void> {
    const tempUserDataStr = localStorage.getItem("tempUserData");
    
    if (tempUserDataStr) {
      await this.createUserProfileFromTempData(user, tempUserDataStr);
    } else {
      console.log("⚠️ Dados temporários não encontrados, apenas marcando email como verificado");
      await this.markEmailAsVerified(user.id);
    }
  }

  private async createUserProfileFromTempData(user: any, tempUserDataStr: string): Promise<void> {
    try {
      const tempUserData = JSON.parse(tempUserDataStr);
      console.log("📝 Criando perfil do usuário com dados temporários...");

      await this.insertOrUpdateUserProfile(user.id, tempUserData);
      await this.setUserPassword(tempUserData.password);
      await this.markEmailAsVerified(user.id);

      localStorage.removeItem("tempUserData");
    } catch (e) {
      console.error("❌ Erro ao processar dados temporários:", e);
      localStorage.removeItem("tempUserData");
    }
  }

  private async insertOrUpdateUserProfile(authId: string, tempUserData: any): Promise<void> {
    const insertData = {
      name: tempUserData.name,
      email: tempUserData.email,
      role: tempUserData.role,
      status: tempUserData.role === "professional" ? "Pending" : "Active",
      avatar_url: `https://i.pravatar.cc/150?u=${authId}`,
      email_verified: true,
    };

    const { error: insertError } = await this.supabase.client
      .from("users")
      .insert(insertData);

    if (insertError) {
      await this.handleInsertError(insertError, authId, tempUserData);
    } else {
      console.log("✅ Perfil criado com sucesso");
    }
  }

  private async handleInsertError(insertError: any, authId: string, tempUserData: any): Promise<void> {
    if (insertError.message.includes("duplicate key")) {
      await this.updateExistingUserProfile(authId, tempUserData);
    } else {
      console.error("❌ Erro ao criar perfil:", insertError);
      this.handleAuthError(insertError, "creating user profile");
    }
  }

  private async updateExistingUserProfile(authId: string, tempUserData: any): Promise<void> {
    console.log("⚠️ Usuário já existe, atualizando...");

    const { error: updateError } = await this.supabase.client
      .from("users")
      .update({
        name: tempUserData.name,
        role: tempUserData.role,
        status: tempUserData.role === "professional" ? "Pending" : "Active",
        email_verified: true,
      })
      .eq("id", authId);

    if (updateError) {
      console.error("❌ Erro no update:", updateError);
      this.handleAuthError(updateError, "updating user profile");
    } else {
      console.log("✅ Perfil atualizado com sucesso");
    }
  }

  async setUserPassword(password: string | undefined): Promise<void> {
    if (!password) return;

    console.log("🔑 Definindo senha do usuário...");
    const { error: passwordError } = await this.supabase.client.auth.updateUser({
      password: password,
    });

    if (passwordError) {
      console.error("❌ Erro ao definir senha:", passwordError);
      throw passwordError;
    } else {
      console.log("✅ Senha definida com sucesso");
    }
  }

  /**
   * Altera a senha do usuário autenticado
   * Usa o sistema de autenticação customizado
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    console.log("🔑 Alterando senha do usuário...");
    
    try {
      const user = this.appUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
      }

      const response = await fetch('http://localhost:4002/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao alterar senha');
      }

      console.log("✅ Senha alterada com sucesso");
      this.notificationService.addNotification("Senha alterada com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro ao alterar senha:", error);
      throw error;
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      console.log("📧 Reenviando código de verificação para:", email);

      // Usar signInWithOtp para reenviar código
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Não criar usuário, apenas reenviar
        },
      });

      if (error) {
        this.handleAuthError(error, "resending verification code");
      } else {
        this.notificationService.addNotification(
          "Um novo código de verificação foi enviado para seu e-mail."
        );
      }
    } catch (error) {
      console.error("Error resending verification code:", error);
      this.notificationService.addNotification(
        "Erro ao reenviar código. Tente novamente."
      );
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: globalThis.location.origin,
      }
    );
    this.handleAuthError(error, "requesting password reset");
    if (!error) {
      this.notificationService.addNotification(
        "Password reset link sent. Please check your email."
      );
    }
  }

  /**
   * Envia um código de redefinição de senha por email
   */
  async sendPasswordResetCode(email: string): Promise<void> {
    console.log("🔑 Enviando código de redefinição de senha para:", email);

    try {
      // Validar formato do e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Formato de e-mail inválido");
      }

      // Verificar se o usuário existe na tabela users
      const { data: existingUser, error: userError } = await this.supabase.client
        .from("users")
        .select("email, name")
        .eq("email", email)
        .single();

      if (userError || !existingUser) {
        throw new Error("E-mail não encontrado em nosso sistema");
      }

      // Gerar token de reset de senha (código de 6 dígitos)
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

      // Salvar token na tabela users
      const { error: updateError } = await this.supabase.client
        .from("users")
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry
        })
        .eq("email", email);

      if (updateError) {
        console.error("❌ Erro ao salvar token de reset:", updateError);
        throw new Error("Erro ao processar solicitação de reset");
      }

      // Enviar e-mail com o código
      console.log("📧 Tentando enviar e-mail para:", environment.emailServiceUrl);
      try {
        const emailResponse = await fetch(environment.emailServiceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            subject: "Redefinição de senha - HomeService",
            html: `
              <p>Olá ${existingUser.name || 'usuário'},</p>
              <p>Você solicitou a redefinição de sua senha.</p>
              <p>Use o código abaixo para redefinir sua senha:</p>
              <h2 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px;">${resetToken}</h2>
              <p><strong>Este código expira em 15 minutos.</strong></p>
              <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
            `
          })
        });

        console.log("📬 Resposta do servidor de e-mail - Status:", emailResponse.status);
        
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("❌ Servidor de e-mail retornou erro:", errorText);
          throw new Error(`Servidor de e-mail retornou status ${emailResponse.status}`);
        }

        const emailResult = await emailResponse.json();
        console.log("✅ Resposta do servidor de e-mail:", emailResult);
        
        if (!emailResult.success) {
          throw new Error("Falha ao enviar e-mail: " + (emailResult.error || "Erro desconhecido"));
        }
        
        console.log("✅ Código de redefinição enviado com sucesso");
      } catch (emailError: any) {
        console.error("❌ Erro detalhado ao enviar e-mail:", emailError);
        console.error("Tipo do erro:", emailError.constructor.name);
        console.error("Mensagem:", emailError.message);
        
        // Verificar se é erro de conexão
        if (emailError.message?.includes('fetch') || emailError.name === 'TypeError') {
          console.error("🔴 ERRO DE CONEXÃO: O servidor de e-mail não está acessível!");
          console.error("Verifique se o servidor está rodando em:", environment.emailServiceUrl);
          throw new Error("Servidor de e-mail não está acessível. Por favor, tente novamente mais tarde.");
        }
        
        throw new Error("Erro ao enviar e-mail: " + emailError.message);
      }
    } catch (error: any) {
      console.error("❌ Erro ao enviar código de redefinição:", error);
      throw error;
    }
  }

  /**
   * Verifica se o código de redefinição de senha é válido
   */
  async verifyPasswordResetCode(email: string, code: string): Promise<boolean> {
    console.log("🔍 Verificando código de redefinição:", code);

    try {
      // Buscar usuário e verificar token
      const { data: user, error } = await this.supabase.client
        .from("users")
        .select("reset_token, reset_token_expiry")
        .eq("email", email)
        .single();

      if (error || !user) {
        console.error("❌ Usuário não encontrado:", error);
        return false;
      }

      // Verificar se o token existe
      if (!user.reset_token) {
        console.error("❌ Nenhum token de reset encontrado");
        return false;
      }

      // Verificar se o token expirou
      const expiryDate = new Date(user.reset_token_expiry);
      const now = new Date();
      if (now > expiryDate) {
        console.error("❌ Token expirado");
        return false;
      }

      // Verificar se o código corresponde
      if (user.reset_token !== code) {
        console.error("❌ Código inválido");
        return false;
      }

      console.log("✅ Código verificado com sucesso");
      return true;
    } catch (error: any) {
      console.error("❌ Erro inesperado ao verificar código:", error);
      return false;
    }
  }

  /**
   * Atualiza a senha após verificação do código customizado
   */
  async updatePasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    console.log("🔄 Atualizando senha após verificação do código");

    try {
      // Primeiro verificar se o código é válido
      const isValid = await this.verifyPasswordResetCode(email, code);
      
      if (!isValid) {
        throw new Error("Código inválido ou expirado");
      }

      console.log("✅ Código verificado, atualizando senha...");

      // Validar comprimento da senha
      if (newPassword.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres");
      }

      // Criar hash SHA256 da senha (mesmo método usado no backend)
      const encoder = new TextEncoder();
      const data = encoder.encode(newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log("🔐 Hash da senha gerado, atualizando no banco...");

      // Atualizar senha e limpar tokens de reset
      const { error: updateError } = await this.supabase.client
        .from("users")
        .update({
          password_hash: passwordHash, // Usar password_hash em vez de password
          reset_token: null,
          reset_token_expiry: null
        })
        .eq("email", email);

      if (updateError) {
        console.error("❌ Erro ao atualizar senha:", updateError);
        throw new Error("Erro ao atualizar senha");
      }

      console.log("✅ Senha atualizada com sucesso");
      
      // Limpar qualquer sessão existente
      this.appUser.set(null);
      this.notificationService.addNotification(
        "Senha atualizada com sucesso! Faça login com sua nova senha."
      );
    } catch (error: any) {
      console.error("❌ Erro ao atualizar senha:", error);
      throw error;
    }
  }

  /**
   * Manipula reset de senha vindo de link de email
   */
  async handlePasswordResetFromUrl(
    accessToken: string,
    refreshToken?: string | null
  ): Promise<void> {
    console.log("🔑 Configurando sessão para reset de senha");

    try {
      // Definir a sessão com os tokens recebidos
      const { error } = await this.supabase.client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      });

      if (error) {
        console.error("❌ Erro ao configurar sessão:", error);
        throw new Error("Erro ao configurar sessão para reset de senha");
      }

      console.log("✅ Sessão configurada para reset de senha");
    } catch (error: any) {
      console.error("❌ Erro ao configurar sessão:", error);
      throw error;
    }
  }

  /**
   * Verifica se há uma sessão ativa no Supabase
   */
  async hasActiveSession(): Promise<{
    hasSession: boolean;
    userEmail?: string;
  }> {
    try {
      const {
        data: { session },
      } = await this.supabase.client.auth.getSession();
      return {
        hasSession: !!session?.user,
        userEmail: session?.user?.email,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error);
      return { hasSession: false };
    }
  }

  /**
   * Escuta mudanças no estado de autenticação
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.client.auth.onAuthStateChange(callback);
  }

  async logout(): Promise<void> {
    console.log("🔓 AuthService - executando logout");

    try {
      const stored = this.readStoredSession();
      if (stored?.token) {
        try {
          await fetch(environment.sessionApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${stored.token}`,
            },
            body: JSON.stringify({ action: "revoke", reason: "logout" }),
          });
        } catch (e) {
          console.warn("⚠️ Falha ao revogar sessão no servidor:", e);
        }
      }

      // Sempre limpar o estado do usuário
      this.appUser.set(null);
      this.clearStoredSession();

      // Também limpar qualquer sessão Supabase local, se existir (defensivo)
      await this.clearLocalSession();
      
      console.log("✅ Estado do usuário limpo");
    } catch (error) {
      console.error("❌ Erro durante logout, limpando localmente:", error);
      await this.clearLocalSession();
      this.appUser.set(null);
      this.clearStoredSession();
    }
  }

  private async clearLocalSession(): Promise<void> {
    // Limpar dados do localStorage/sessionStorage se necessário
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.removeItem("supabase.auth.token");

    // Forçar limpeza da sessão no Supabase (sem fazer request se não houver sessão)
    try {
      await this.supabase.client.auth.signOut({ scope: "local" });
    } catch (error) {
      console.log("🔄 Limpeza local do Supabase concluída com erro:", error);
    }
  }

  async markEmailAsVerified(authId: string): Promise<void> {
    console.log("✅ Marcando email como verificado para user:", authId);

    const { error } = await this.supabase.client
      .from("users")
      .update({ email_verified: true })
      .eq("id", authId);

    if (error) {
      console.error("❌ Erro ao marcar email como verificado:", error);
      this.handleAuthError(error, "marking email as verified");
    } else {
      console.log("✅ Email marcado como verificado com sucesso");
      // Recarregar o usuário (não é automático, é manual)
      await this.fetchAppUser(authId, false);
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const user = this.appUser();
    if (!user) {
      console.error("❌ No user logged in for profile update");
      throw new Error("No user logged in");
    }

    console.log("📝 Updating user profile:", updates);

    try {
      const { data, error } = await this.supabase.client
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error updating profile:", error);
        this.handleAuthError(error, "updating profile");
        throw error;
      }

      if (data) {
        console.log("✅ Profile updated successfully:", data);
        this.appUser.set(data as User);
        // Don't show notification here - let the calling component handle it
      } else {
        console.error("❌ No data returned from profile update");
        throw new Error("No data returned from profile update");
      }
    } catch (error) {
      console.error("❌ Unexpected error updating profile:", error);
      throw error;
    }
  }

  async updateAvatarUrl(avatarUrl: string): Promise<void> {
    const user = this.appUser();
    if (!user) return;

    try {
      const { data, error } = await this.supabase.client
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating avatar URL:", error);
        this.notificationService.addNotification("Error updating avatar");
        return;
      }

      if (data) {
        this.appUser.set(data as User);
        // Atualizar sessão armazenada com dados do usuário atualizados
        const stored = this.readStoredSession();
        if (stored?.token && stored?.expiresAt) {
          this.writeStoredSession({
            token: stored.token,
            expiresAt: stored.expiresAt,
            user: data as User,
          });
        }
        console.log("✅ Avatar URL updated successfully");
        console.log("📷 New Avatar URL:", data.avatar_url);
      }
    } catch (error: any) {
      console.error("Unexpected error updating avatar:", error);
      this.notificationService.addNotification("Error updating avatar");
    }
  }

  private async deleteOldAvatar(
    userId: string,
    currentAvatarUrl: string
  ): Promise<void> {
    try {
      // Extract file path from the current avatar URL
      const urlParts = currentAvatarUrl.split("/");
      const bucketIndex = urlParts.indexOf("avatars");

      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        console.log("Could not extract file path from avatar URL");
        return;
      }

      // Get the file path (everything after 'avatars/')
      const filePath = urlParts.slice(bucketIndex + 1).join("/");

      console.log(`🗑️ Deleting old avatar: ${filePath}`);

      const { error } = await this.supabase.client.storage
        .from("avatars")
        .remove([filePath]);

      if (error) {
        console.error("Error deleting old avatar:", error);
        // Don't throw error - this shouldn't stop the upload
      } else {
        console.log("✅ Old avatar deleted successfully");
      }
    } catch (error) {
      console.error("Unexpected error deleting old avatar:", error);
      // Don't throw error - this shouldn't stop the upload
    }
  }

  async uploadAvatar(file: File): Promise<void> {
    const user = this.appUser();
    const supabaseUser = this.supabaseUser();

    if (!user || !supabaseUser) {
      this.notificationService.addNotification("No user logged in");
      return;
    }

    try {
      // Delete old avatar if user has one (but don't fail if deletion fails)
      if (user.avatar_url && !user.avatar_url.includes("pravatar.cc")) {
        await this.deleteOldAvatar(supabaseUser.id, user.avatar_url);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      // Usar user.id para organização de arquivos
      const filePath = `${supabaseUser.id}/${fileName}`;

      console.log(`📤 Uploading avatar: ${fileName} to path: ${filePath}`);

      // Tentar fazer upload diretamente (bucket já existe no Supabase)
      const { error: uploadError } = await this.supabase.client.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError);

        if (uploadError.message.includes("Bucket not found")) {
          this.notificationService.addNotification(
            "Storage bucket 'avatars' not found. Please check Supabase configuration."
          );
        } else if (uploadError.message.includes("payload too large")) {
          this.notificationService.addNotification(
            "Image too large. Please use an image smaller than 2MB."
          );
        } else if (uploadError.message.includes("file type")) {
          this.notificationService.addNotification(
            "Invalid file type. Please use JPG, PNG, GIF or WebP images."
          );
        } else {
          this.notificationService.addNotification(
            "Error uploading image. Please try again."
          );
        }
        return;
      }

      console.log(`✅ Upload successful: ${fileName}`);

      // Obter URL pública
      const { data } = this.supabase.client.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (data) {
        // Adicionar timestamp como query parameter para cache-busting
        // Isso garante que a imagem seja recarregada mesmo se estiver em cache
        const avatarUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
        console.log(`📷 Public URL: ${avatarUrlWithCacheBust}`);
        await this.updateAvatarUrl(avatarUrlWithCacheBust);
        this.notificationService.addNotification(
          "Photo uploaded successfully!"
        );
      } else {
        console.error("Failed to generate public URL");
        this.notificationService.addNotification("Error generating image URL");
      }
    } catch (error: any) {
      console.error("Unexpected error uploading avatar:", error);
      this.notificationService.addNotification(
        `Upload failed: ${error.message || "Unknown error"}`
      );
    }
  }

  private async handleEmailConfirmedViaLink(detail: {
    user: any;
    tempData: string;
  }): Promise<void> {
    console.log("🔗 Processando confirmação de email via link");

    try {
      const { user, tempData } = detail;
      const tempUserData = this.parseTempUserData(tempData);

      console.log("� Usuário confirmado:", user.email);
      if (tempUserData) {
        console.log("�📝 Dados temporários encontrados:", tempUserData);
      } else {
        console.log("⚠️ Nenhum dado temporário encontrado. Será criado perfil mínimo.");
      }

      await this.ensureUserProfile(user, tempUserData);
      await this.setPasswordIfAvailable(tempUserData);

      this.finalizeEmailConfirmation();
    } catch (error) {
      console.error("❌ Erro ao processar confirmação via link:", error);
      localStorage.removeItem("tempUserData");
    }
  }

  private parseTempUserData(tempData: string): any {
    try {
      return tempData ? JSON.parse(tempData) : null;
    } catch {
      return null;
    }
  }

  private async ensureUserProfile(user: any, tempUserData: any): Promise<void> {
    console.log("[DEBUG] ensureUserProfile chamado para:", { user, tempUserData });

    const { data: existingProfile, error: fetchError } = await this.supabase.client
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (this.isUnexpectedFetchError(fetchError)) {
      this.handleFetchProfileError(fetchError);
      return;
    }

    if (existingProfile) {
      await this.updateEmailVerified(user.id);
    } else {
      await this.createProfileForConfirmedUser(user, tempUserData);
    }
  }

  private isUnexpectedFetchError(fetchError: any): boolean {
    return fetchError && fetchError.code !== 'PGRST116';
  }

  private handleFetchProfileError(fetchError: any): void {
    console.error("[DEBUG] Erro inesperado ao buscar perfil:", fetchError);
    console.error("❌ Erro ao buscar perfil:", fetchError);
    this.notificationService.addNotification("Erro ao buscar perfil do usuário: " + (fetchError.message || fetchError.code));
  }

  private async updateEmailVerified(authId: string): Promise<void> {
    console.log("📝 Perfil já existe, atualizando email_verified...");
    const { error: updateError } = await this.supabase.client
      .from("users")
      .update({ email_verified: true })
      .eq("id", authId);
    if (updateError) {
      console.error("❌ Erro ao atualizar email_verified:", updateError);
      this.notificationService.addNotification("Erro ao atualizar verificação de email do perfil: " + (updateError.message || updateError.code));
    } else {
      console.log("✅ email_verified atualizado com sucesso");
    }
  }

  private async createProfileForConfirmedUser(user: any, tempUserData: any): Promise<void> {
    console.log("📝 Criando perfil para usuário confirmado via link...");
    const insertData = {
      name: tempUserData?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Novo Usuário',
      email: user.email,
      role: tempUserData?.role || 'professional', // Client role removed from system
      status: tempUserData?.role === "professional" ? "Pending" : "Active",
      avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
      email_verified: true,
    };
    console.log("🔎 Dados para insert de perfil:", insertData);
    // SQL de insert apenas para debug pode ser removido, pois não é utilizado
    const { data: insertResult, error: insertError } = await this.supabase.client
      .from("users")
      .insert(insertData)
      .select();
    console.log("🟢 Resultado do insert:", { insertResult, insertError });
    if (insertError) {
      this.handleInsertProfileError(insertError, insertData);
    } else {
      console.log("✅ Perfil criado com sucesso", insertResult);
      this.notificationService.addNotification("Perfil criado com sucesso!");
    }
  }

  private handleInsertProfileError(insertError: any, insertData: any): void {
    console.error("❌ Erro ao criar perfil:", insertError, "Payload:", insertData);
    this.notificationService.addNotification(
      "Erro ao criar perfil do usuário: " + (insertError.message || insertError.code) +
      (insertError.details ? "\n" + insertError.details : "")
    );
  }

  private async setPasswordIfAvailable(tempUserData: any): Promise<void> {
    if (tempUserData?.password) {
      console.log("🔑 Definindo senha para usuário confirmado via link...");
      const { error: passwordError } =
        await this.supabase.client.auth.updateUser({
          password: tempUserData.password,
        });
      if (passwordError) {
        console.error("❌ Erro ao definir senha:", passwordError);
      } else {
        console.log("✅ Senha definida com sucesso");
      }
    }
  }

  private async finalizeEmailConfirmation(): Promise<void> {
    localStorage.removeItem("tempUserData");
    console.log("🔒 Fazendo logout para redirecionar para login...");
    await this.supabase.client.auth.signOut();
    this.notificationService.addNotification(
      `Conta confirmada com sucesso! Faça login com suas credenciais para acessar a aplicação.`
    );
    this.pendingEmailConfirmation.set(null);
    console.log("✅ Confirmação via link processada com sucesso");
  }
}
