import { effect, inject, Injectable, signal } from "@angular/core";
import { User, UserRole } from "../models/maintenance.models";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { AuthError, AuthResponse } from "@supabase/supabase-js";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  private supabaseUser = this.supabase.currentUser;

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
    window.addEventListener("emailConfirmedViaLink", async (event: any) => {
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
      console.log("⚠️ Email NÃO verificado na tabela users.");

      // CORREÇÃO: Verificar se email foi confirmado no Supabase
      console.log("🔍 Verificando confirmação no Supabase...");
      const { data: supabaseUser, error: supabaseError } =
        await this.supabase.client.auth.getUser();

      if (!supabaseError && supabaseUser.user?.email_confirmed_at) {
        console.log(
          "✅ Email confirmado no Supabase! Atualizando tabela users..."
        );

        // Atualizar email_verified na tabela users
        const { error: updateError } = await this.supabase.client
          .from("users")
          .update({ email_verified: true })
          .eq("auth_id", userId);

        if (updateError) {
          console.error("❌ Erro ao atualizar email_verified:", updateError);
        } else {
          console.log("✅ Campo email_verified atualizado com sucesso");
          // Recarregar dados do usuário com email_verified atualizado
          user.email_verified = true;
        }
      } else {
        console.log("❌ Email ainda não confirmado no Supabase");

        if (isAutomatic) {
          // Se é uma chamada automática (effect), apenas fazer logout silencioso
          console.log("🔄 Chamada automática - fazendo logout silencioso");
          await this.supabase.client.auth.signOut();
          this.appUser.set(null);
          // NÃO definir pendingEmailConfirmation para não redirecionar
        } else {
          // Se é uma chamada manual (verificação), redirecionar para tela de verificação
          console.log("📧 Chamada manual - redirecionando para verificação");
          this.pendingEmailConfirmation.set(user.email);
          this.appUser.set(null);
          await this.supabase.client.auth.signOut();
        }
        return;
      }
    }

    console.log("✅ Email verificado. Carregando usuário");
    this.pendingEmailConfirmation.set(null);
    this.appUser.set(user);
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
        this.handleAuthError(response.error as AuthError, "logging in");
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
        } else if (!userData?.email_verified) {
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
        } else {
          console.log("✅ Email verificado, login permitido");
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

    this.notificationService.addNotification(
      "Um código de verificação foi enviado para seu e-mail. Verifique sua caixa de entrada e spam."
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
      this.handleAuthError(response.error as AuthError, "verifying OTP");
      return response;
    }

    // Se a verificação foi bem-sucedida, criar o perfil do usuário
    if (response.data.user) {
      console.log("✅ OTP verificado com sucesso!");

      // Recuperar dados temporários do usuário
      const tempUserDataStr = localStorage.getItem("tempUserData");
      if (tempUserDataStr) {
        try {
          const tempUserData = JSON.parse(tempUserDataStr);
          console.log("📝 Criando perfil do usuário com dados temporários...");

          // Criar perfil na tabela users
          const insertData = {
            auth_id: response.data.user.id,
            name: tempUserData.name,
            email: tempUserData.email,
            role: tempUserData.role,
            status: tempUserData.role === "professional" ? "Pending" : "Active",
            avatar_url: `https://i.pravatar.cc/150?u=${response.data.user.id}`,
            email_verified: true, // Email verificado via OTP
          };

          const { error: insertError } = await this.supabase.client
            .from("users")
            .insert(insertData);

          if (insertError) {
            if (insertError.message.includes("duplicate key")) {
              console.log("⚠️ Usuário já existe, atualizando...");

              const { error: updateError } = await this.supabase.client
                .from("users")
                .update({
                  name: tempUserData.name,
                  role: tempUserData.role,
                  status:
                    tempUserData.role === "professional" ? "Pending" : "Active",
                  email_verified: true,
                })
                .eq("auth_id", response.data.user.id);

              if (updateError) {
                console.error("❌ Erro no update:", updateError);
                this.handleAuthError(updateError, "updating user profile");
              } else {
                console.log("✅ Perfil atualizado com sucesso");
              }
            } else {
              console.error("❌ Erro ao criar perfil:", insertError);
              this.handleAuthError(insertError, "creating user profile");
            }
          } else {
            console.log("✅ Perfil criado com sucesso");
          }

          // Limpar dados temporários
          localStorage.removeItem("tempUserData");

          // Definir senha do usuário (necessário para login posterior)
          if (tempUserData.password) {
            console.log("🔑 Definindo senha do usuário...");
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

          // Marcar email como verificado na tabela
          await this.markEmailAsVerified(response.data.user.id);
        } catch (e) {
          console.error("❌ Erro ao processar dados temporários:", e);
          // Limpar dados temporários mesmo em caso de erro
          localStorage.removeItem("tempUserData");
        }
      } else {
        console.log(
          "⚠️ Dados temporários não encontrados, apenas marcando email como verificado"
        );
        await this.markEmailAsVerified(response.data.user.id);
      }
    }

    return response;
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
        redirectTo: window.location.origin,
      }
    );
    this.handleAuthError(error, "requesting password reset");
    if (!error) {
      this.notificationService.addNotification(
        "Password reset link sent. Please check your email."
      );
    }
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
      console.log("🔄 Limpeza local do Supabase concluída");
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
      const bucketIndex = urlParts.findIndex((part) => part === "avatars");

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
      const tempUserData = JSON.parse(tempData);

      console.log("📝 Dados temporários encontrados:", tempUserData);
      console.log("👤 Usuário confirmado:", user.email);

      // Verificar se perfil já existe
      const { data: existingProfile } = await this.supabase.client
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!existingProfile) {
        console.log("📝 Criando perfil para usuário confirmado via link...");

        // Criar perfil na tabela users
        const insertData = {
          auth_id: user.id,
          name: tempUserData.name,
          email: tempUserData.email,
          role: tempUserData.role,
          status: tempUserData.role === "professional" ? "Pending" : "Active",
          avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
          email_verified: true, // Email já confirmado via link
        };

        const { error: insertError } = await this.supabase.client
          .from("users")
          .insert(insertData);

        if (insertError) {
          console.error("❌ Erro ao criar perfil:", insertError);
        } else {
          console.log("✅ Perfil criado com sucesso");
        }
      } else {
        console.log("📝 Perfil já existe, atualizando email_verified...");

        const { error: updateError } = await this.supabase.client
          .from("users")
          .update({ email_verified: true })
          .eq("auth_id", user.id);

        if (updateError) {
          console.error("❌ Erro ao atualizar email_verified:", updateError);
        } else {
          console.log("✅ email_verified atualizado com sucesso");
        }
      }

      // Definir senha do usuário
      if (tempUserData.password) {
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

      // Limpar dados temporários
      localStorage.removeItem("tempUserData");

      // Fazer logout para forçar login com credenciais
      console.log("🔒 Fazendo logout para redirecionar para login...");
      await this.supabase.client.auth.signOut();

      // Mostrar notificação de sucesso
      this.notificationService.addNotification(
        `Conta confirmada com sucesso! Faça login com suas credenciais para acessar a aplicação.`
      );

      // Limpar estado de confirmação pendente
      this.pendingEmailConfirmation.set(null);

      console.log("✅ Confirmação via link processada com sucesso");
    } catch (error) {
      console.error("❌ Erro ao processar confirmação via link:", error);
      // Limpar dados temporários mesmo em caso de erro
      localStorage.removeItem("tempUserData");
    }
  }
}
