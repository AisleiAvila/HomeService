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
        await this.fetchAppUser(sUser.id);
      } else {
        console.log("👤 Nenhum usuário logado");
        this.appUser.set(null);
        this.pendingEmailConfirmation.set(null);
      }
    });
  }

  private async fetchAppUser(userId: string) {
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
      console.log(
        "⚠️ Email NÃO verificado. Definindo pendingEmailConfirmation"
      );
      this.pendingEmailConfirmation.set(user.email);
      this.appUser.set(null);
      // Fazer logout para forçar verificação
      await this.supabase.client.auth.signOut();
      return;
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
    console.log("🎯 IMPORTANTE: Role recebido como parâmetro:", role);
    console.log("🎯 IMPORTANTE: Tipo do role:", typeof role);
    console.log("🎯 IMPORTANTE: Parâmetros completos:", { name, email, role });

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

    const { data: signUpData, error: signUpError } =
      await this.supabase.client.auth.signUp({
        email,
        password,
      });

    if (signUpError) {
      console.error("❌ Erro no signUp:", signUpError);

      // Tratamento específico para diferentes tipos de erro
      if (signUpError.message.includes("User already registered")) {
        this.notificationService.addNotification(
          "E-mail já cadastrado. Tente fazer login ou use outro e-mail."
        );
      } else if (signUpError.message.includes("invalid format")) {
        this.notificationService.addNotification(
          "Formato de e-mail inválido. Use o formato: usuario@email.com"
        );
      } else if (signUpError.message.includes("email address")) {
        this.notificationService.addNotification(
          "E-mail inválido. Verifique se digitou corretamente."
        );
      } else {
        this.handleAuthError(signUpError, "registering");
      }
      return;
    }

    console.log("✅ SignUp bem-sucedido:", signUpData.user?.id);

    if (signUpData.user) {
      // Verificar se o usuário foi automaticamente confirmado pelo Supabase
      console.log("📊 Dados do usuário recém-criado:");
      console.log("  - id:", signUpData.user.id);
      console.log("  - email:", signUpData.user.email);
      console.log(
        "  - email_confirmed_at:",
        signUpData.user.email_confirmed_at
      );
      console.log(
        "  - phone_confirmed_at:",
        signUpData.user.phone_confirmed_at
      );

      // Criar perfil do usuário na tabela users
      console.log("📝 Criando perfil do usuário na tabela users");
      console.log("🔍 Dados que serão inseridos na tabela users:");
      console.log("  - auth_id:", signUpData.user.id);
      console.log("  - name:", name);
      console.log("  - email:", email);
      console.log("  - role:", role);
      console.log(
        "  - status:",
        role === "professional" ? "Pending" : "Active"
      );

      const insertData = {
        auth_id: signUpData.user.id,
        name,
        email,
        role: "client", // FORÇANDO "client" para testar
        status: role === "professional" ? "Pending" : "Active", // Professionals need approval
        avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
        email_verified: false, // Email não verificado inicialmente
      };

      console.log("📊 Objeto completo sendo inserido:", insertData);
      console.log(
        "🎯 IMPORTANTE: Role sendo inserido (hardcoded):",
        insertData.role
      );

      const { error: insertError } = await this.supabase.client
        .from("users")
        .insert(insertData);

      if (insertError) {
        console.error("❌ Erro ao criar perfil:", insertError);
        console.error("❌ Detalhes do erro:", insertError.message);
        console.error("❌ Código do erro:", insertError.code);

        // Se for erro de UNIQUE constraint (usuário já existe), vamos fazer UPDATE
        if (
          insertError.message.includes("duplicate key") ||
          insertError.message.includes("already exists")
        ) {
          console.log("⚠️ Usuário já existe, tentando UPDATE...");

          const { error: updateError } = await this.supabase.client
            .from("users")
            .update({
              name,
              role: "client", // FORÇANDO "client"
              status: role === "professional" ? "Pending" : "Active",
              avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
              email_verified: false, // Email não verificado inicialmente
            })
            .eq("auth_id", signUpData.user.id);

          if (updateError) {
            console.error("❌ Erro no UPDATE:", updateError);
            this.handleAuthError(updateError, "updating user profile");
          } else {
            console.log("✅ Perfil atualizado com sucesso");

            // IMPORTANTE: Definir e-mail pendente PRIMEIRO (antes do logout)
            console.log(
              "📧 Definindo e-mail pendente de confirmação (UPDATE):",
              email
            );
            this.pendingEmailConfirmation.set(email);

            // SEMPRE fazer logout para garantir que o usuário vá para tela de verificação
            console.log(
              "� Fazendo logout obrigatório para tela de verificação"
            );
            await this.supabase.client.auth.signOut();

            this.notificationService.addNotification(
              "Registration successful! Please check your email to verify your account."
            );
          }
        } else {
          this.handleAuthError(insertError, "creating user profile");
        }
      } else {
        console.log("✅ Perfil criado com sucesso");

        // Verificar o que foi realmente inserido na base de dados
        console.log("🔍 Verificando dados inseridos na base de dados...");
        const { data: insertedUser, error: selectError } =
          await this.supabase.client
            .from("users")
            .select("*")
            .eq("auth_id", signUpData.user.id)
            .single();

        if (selectError) {
          console.error("❌ Erro ao buscar usuário inserido:", selectError);
        } else {
          console.log("📊 Dados realmente inseridos na base:", insertedUser);
          console.log("🎯 Role na base de dados:", insertedUser.role);
        }

        // Definir e-mail pendente de confirmação PRIMEIRO (antes do logout)
        console.log("📧 Definindo e-mail pendente de confirmação:", email);
        this.pendingEmailConfirmation.set(email);

        // SEMPRE fazer logout para garantir que o usuário vá para tela de verificação
        console.log("� Fazendo logout obrigatório para tela de verificação");
        await this.supabase.client.auth.signOut();

        this.notificationService.addNotification(
          "Registration successful! Please check your email to verify your account."
        );
      }
    }
  }

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    console.log("🔍 Verificando OTP para:", email);

    const response = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    this.handleAuthError(response.error as AuthError, "verifying OTP");

    // Se a verificação foi bem-sucedida, marcar email como verificado
    if (!response.error && response.data.user) {
      console.log(
        "✅ OTP verificado com sucesso, marcando email como verificado"
      );
      await this.markEmailAsVerified(response.data.user.id);
    }

    return response;
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.client.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        this.handleAuthError(error, "resending verification code");
      } else {
        this.notificationService.addNotification(
          "A new verification code has been sent to your email."
        );
      }
    } catch (error) {
      console.error("Error resending verification code:", error);
      this.notificationService.addNotification(
        "Error resending verification code. Please try again."
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
    const { error } = await this.supabase.client.auth.signOut();
    this.handleAuthError(error, "logging out");
    if (!error) {
      this.appUser.set(null);
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
      // Recarregar o usuário
      await this.fetchAppUser(authId);
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
}
