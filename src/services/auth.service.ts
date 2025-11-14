import { effect, inject, Injectable, signal } from "@angular/core";
import { User, UserRole } from "../models/maintenance.models";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { AuthError, AuthResponse } from "@supabase/supabase-js";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  /**
   * Recarrega o perfil do usuário autenticado (público)
   */
  async refreshAppUser(authId: string): Promise<void> {
    await this.fetchAppUser(authId, false);
  }
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);

  private readonly supabaseUser = this.supabase.currentUser;

  // The application's user profile, fetched from the 'users' table.
  readonly appUser = signal<User | null>(null);

  // Indica se há um usuário que precisa confirmar e-mail
  readonly pendingEmailConfirmation = signal<string | null>(null);

  constructor() {
    effect(async () => {
      const sUser = this.supabaseUser();
      console.log("🔍 AuthService effect triggered. sUser:", sUser?.id);

      if (sUser) {
        console.log("👤 Usuário autenticado, buscando perfil...");
        await this.fetchAppUser(sUser.id, true); // true = chamada automática

        // Inicializar NotificationService para o usuário atual
        const currentUser = this.appUser();
        if (currentUser) {
          this.notificationService.initializeForUser(currentUser.id);
        }
      } else {
        console.log("👤 Nenhum usuário logado");
        this.appUser.set(null);
        this.pendingEmailConfirmation.set(null);
      }
    });

    // Listener para confirmação de email via link
    globalThis.addEventListener("emailConfirmedViaLink", async (event: any) => {
      console.log("🔗 Processando confirmação via link...");
      await this.handleEmailConfirmedViaLink(event.detail);
    });
  }

  private async fetchAppUser(userId: string, isAutomatic: boolean = true) {
    console.log("🔍 Buscando usuário com auth_id:", userId);

    const { data, error } = await this.supabase.client
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .single();

    if (error) {
      console.error("❌ Supabase fetchAppUser error:", error);
      if (error.code !== "PGRST116") {
        // PGRST116: "object not found" - this is expected on first login after signup
        this.handleAuthError(error, "fetching user profile");
      }
      this.appUser.set(null);
      return;
    }

    const user = data as User;
    console.log("👤 Usuário encontrado:", user.email);
    console.log("📧 Email verificado:", user.email_verified);

    // Verificar se o email foi verificado
    if (!user.email_verified) {
      await this.handleUnverifiedEmail(user, userId, isAutomatic);
      return;
    }

    console.log("✅ Email verificado. Carregando usuário");
    this.pendingEmailConfirmation.set(null);
    this.appUser.set(user);
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
      .eq("auth_id", userId);

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
    console.log("AuthService - Tentando login com:", email);

    try {
      // Validação básica
      if (!email || !password) {
        throw new Error("Email e senha são obrigatórios");
      }

      console.log("Chamando signInWithPassword...");

      const response = await this.supabase.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log("Resposta do signInWithPassword:", {
        user: response.data?.user?.id,
        session: !!response.data?.session,
        error: response.error,
      });

      if (response.error) {
        console.error("Erro detalhado:", {
          message: response.error.message,
          status: response.error.status,
          name: response.error.name,
        });
        this.handleAuthError(response.error, "logging in");
        return response;
      }

      // Se login foi bem-sucedido, verificar se email foi verificado
      if (response.data?.user) {
        console.log("🔍 Login bem-sucedido, verificando email_verified...");

        const { data: userData, error: userError } = await this.supabase.client
          .from("users")
          .select("email_verified")
          .eq("auth_id", response.data.user.id)
          .single();

        if (userError) {
          console.error("❌ Erro ao verificar email_verified:", userError);
        } else if (userData?.email_verified) {
          console.log("✅ Email verificado, login permitido");
        } else {
          console.log("⚠️ Email não verificado, bloqueando login");

          // Fazer logout imediatamente
          await this.supabase.client.auth.signOut();

          // NÃO definir pendingEmailConfirmation - manter na tela de login
          // this.pendingEmailConfirmation.set(response.data.user.email || email);

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
      console.error("Erro inesperado no login:", error);
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

    // Verificar se já existe um usuário com este e-mail na nossa tabela
    console.log("🔍 Verificando se e-mail já existe na base de dados...");
    const { data: existingUser } = await this.supabase.client
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      console.log("⚠️ E-mail já existe na tabela users");
      this.notificationService.addNotification(
        "E-mail já cadastrado. Tente fazer login ou use outro e-mail."
      );
      return;
    }

    // SOLUÇÃO ALTERNATIVA: Usar signInWithOtp que sempre envia email
    console.log("📧 Enviando código de verificação via OTP...");
    const { error: otpError } = await this.supabase.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          name,
          role,
          password, // Guardar temporariamente nos metadados
        },
      },
    });

    if (otpError) {
      console.error("❌ Erro ao enviar OTP:", otpError);

      // Tratamento específico para diferentes tipos de erro
      if (otpError.message.includes("User already registered")) {
        this.notificationService.addNotification(
          "E-mail já cadastrado. Tente fazer login ou use outro e-mail."
        );
      } else if (otpError.message.includes("invalid format")) {
        this.notificationService.addNotification(
          "Formato de e-mail inválido. Use o formato: usuario@email.com"
        );
      } else if (otpError.message.includes("email address")) {
        this.notificationService.addNotification(
          "E-mail inválido. Verifique se digitou corretamente."
        );
      } else if (otpError.message.includes("rate limit")) {
        this.notificationService.addNotification(
          "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        );
      } else {
        this.handleAuthError(otpError, "sending verification code");
      }
      return;
    }

    console.log("✅ Código de verificação enviado com sucesso!");

    // Guardar dados do usuário temporariamente para criar perfil após verificação
    const tempUserData = {
      name,
      email,
      password,
      role,
      timestamp: Date.now(),
    };

    // Armazenar no localStorage temporariamente (será limpo após verificação)
    localStorage.setItem("tempUserData", JSON.stringify(tempUserData));

    // Definir e-mail pendente de confirmação
    console.log("📧 Definindo e-mail pendente de confirmação:", email);
    this.pendingEmailConfirmation.set(email);

    // SEMPRE fazer logout para garantir que o usuário vá para tela de verificação
    console.log("🔒 Fazendo logout obrigatório para tela de verificação");
    await this.supabase.client.auth.signOut();

    // Mensagem de sucesso bem visível
    console.log("✅ ========================================");
    console.log("✅ E-MAIL DE VERIFICAÇÃO ENVIADO COM SUCESSO!");
    console.log("✅ Destinatário:", email);
    console.log("✅ Tipo de cadastro:", role === "professional" ? "Profissional" : "Cliente");
    console.log("✅ ========================================");
    
    this.notificationService.addNotification(
      "✅ Cadastro realizado! Um código de verificação foi enviado para seu e-mail. Verifique sua caixa de entrada e pasta de spam."
    );
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
      auth_id: authId,
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
      .eq("auth_id", authId);

    if (updateError) {
      console.error("❌ Erro no update:", updateError);
      this.handleAuthError(updateError, "updating user profile");
    } else {
      console.log("✅ Perfil atualizado com sucesso");
    }
  }

  private async setUserPassword(password: string | undefined): Promise<void> {
    if (!password) return;

    console.log("🔑 Definindo senha do usuário...");
    const { error: passwordError } = await this.supabase.client.auth.updateUser({
      password: password,
    });

    if (passwordError) {
      console.error("❌ Erro ao definir senha:", passwordError);
    } else {
      console.log("✅ Senha definida com sucesso");
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
      const { data: existingUser } = await this.supabase.client
        .from("users")
        .select("email, auth_id")
        .eq("email", email)
        .single();

      if (!existingUser) {
        throw new Error("E-mail não encontrado em nosso sistema");
      }

      // Usar signInWithOtp para enviar código de verificação
      const { error } = await this.supabase.client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          data: {
            isPasswordReset: true, // Flag para identificar que é reset de senha
          },
        },
      });

      if (error) {
        console.error("❌ Erro ao enviar código de redefinição:", error);
        throw new Error(
          error.message || "Erro ao enviar código de redefinição"
        );
      }

      console.log("✅ Código de redefinição enviado com sucesso");
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
      const { data, error } = await this.supabase.client.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        console.error("❌ Erro ao verificar código:", error);
        return false;
      }

      if (data.user) {
        console.log("✅ Código verificado com sucesso");
        // Armazenar temporariamente a sessão para permitir mudança de senha
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("❌ Erro inesperado ao verificar código:", error);
      return false;
    }
  }

  /**
   * Atualiza a senha após verificação do código OTP
   */
  async updatePasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    console.log("🔄 Atualizando senha após verificação OTP");

    try {
      // Primeiro verificar o código OTP e estabelecer sessão
      const { data, error: verifyError } =
        await this.supabase.client.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });

      if (verifyError || !data.user) {
        console.error("❌ Erro ao verificar código:", verifyError);
        throw new Error("Código inválido ou expirado");
      }

      console.log("✅ Código verificado, atualizando senha...");

      // Agora que temos uma sessão válida, atualizar a senha
      const { error: updateError } = await this.supabase.client.auth.updateUser(
        {
          password: newPassword,
        }
      );

      if (updateError) {
        console.error("❌ Erro ao atualizar senha:", updateError);
        throw new Error(updateError.message || "Erro ao atualizar senha");
      }

      console.log("✅ Senha atualizada com sucesso");

      // Fazer logout para forçar novo login com a nova senha
      await this.supabase.client.auth.signOut();
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
      // Verificar se há uma sessão ativa antes de tentar logout
      const {
        data: { session },
      } = await this.supabase.client.auth.getSession();

      if (session) {
        console.log("📋 Sessão encontrada, fazendo logout via API");
        const { error } = await this.supabase.client.auth.signOut();
        if (error) {
          console.warn(
            "⚠️ Erro no logout via API, limpando localmente:",
            error.message
          );
          // Se falhar, limpar dados localmente
          await this.clearLocalSession();
        } else {
          console.log("✅ Logout realizado com sucesso via API");
        }
      } else {
        console.log("🔄 Nenhuma sessão ativa, limpando dados localmente");
        await this.clearLocalSession();
      }

      // Sempre limpar o estado do usuário
      this.appUser.set(null);
      console.log("✅ Estado do usuário limpo");
    } catch (error) {
      console.error("❌ Erro durante logout, limpando localmente:", error);
      await this.clearLocalSession();
      this.appUser.set(null);
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
      .eq("auth_id", authId);

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
        console.log("✅ Avatar URL updated successfully");
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
      // Usar auth_id do Supabase para RLS compliance
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
        console.log(`📷 Public URL: ${data.publicUrl}`);
        await this.updateAvatarUrl(data.publicUrl);
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
    // Verificar se perfil já existe
    const { data: existingProfile, error: fetchError } = await this.supabase.client
      .from("users")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("[DEBUG] Erro inesperado ao buscar perfil:", fetchError);
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Erro inesperado ao buscar perfil
      console.error("❌ Erro ao buscar perfil:", fetchError);
      this.notificationService.addNotification("Erro ao buscar perfil do usuário: " + (fetchError.message || fetchError.code));
      return;
    }

    if (existingProfile) {
      console.log("📝 Perfil já existe, atualizando email_verified...");
      const { error: updateError } = await this.supabase.client
        .from("users")
        .update({ email_verified: true })
        .eq("auth_id", user.id);
      if (updateError) {
        console.error("❌ Erro ao atualizar email_verified:", updateError);
        this.notificationService.addNotification("Erro ao atualizar verificação de email do perfil: " + (updateError.message || updateError.code));
      } else {
        console.log("✅ email_verified atualizado com sucesso");
      }
    } else {
      console.log("📝 Criando perfil para usuário confirmado via link...");
      const insertData = {
        auth_id: user.id,
        name: tempUserData?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Novo Usuário',
        email: user.email,
        role: tempUserData?.role || 'client',
        status: tempUserData?.role === "professional" ? "Pending" : "Active",
        avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
        email_verified: true,
      };
      console.log("🔎 Dados para insert de perfil:", insertData);
      // Monta query SQL para debug
      const insertSQL = `INSERT INTO users (auth_id, name, email, role, status, avatar_url, email_verified) VALUES (
        '${insertData.auth_id}',
        '${insertData.name.replace(/'/g, "''")}',
        '${insertData.email}',
        '${insertData.role}',
        '${insertData.status}',
        '${insertData.avatar_url}',
        ${insertData.email_verified ? 'TRUE' : 'FALSE'}
      );`;
      console.log("📝 Query SQL de insert:", insertSQL);
      const { data: insertResult, error: insertError } = await this.supabase.client
        .from("users")
        .insert(insertData)
        .select();
      console.log("🟢 Resultado do insert:", { insertResult, insertError });
      if (insertError) {
        console.error("❌ Erro ao criar perfil:", insertError, "Payload:", insertData);
        this.notificationService.addNotification(
          "Erro ao criar perfil do usuário: " + (insertError.message || insertError.code) +
          (insertError.details ? "\n" + insertError.details : "")
        );
      } else {
        console.log("✅ Perfil criado com sucesso", insertResult);
        this.notificationService.addNotification("Perfil criado com sucesso!");
      }
    }
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
