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

  constructor() {
    effect(async () => {
      const sUser = this.supabaseUser();
      if (sUser) {
        // When supabase user exists, fetch our custom user profile
        await this.fetchAppUser(sUser.id);
      } else {
        // When supabase user is null (logged out), clear our app user
        this.appUser.set(null);
      }
    });
  }

  private async fetchAppUser(userId: string) {
    console.log("Buscando usuário com auth_id:", userId);
    const { data, error } = await this.supabase.client
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .single();

    if (error) {
      console.error("Supabase fetchAppUser error:", error);
      if (error.code !== "PGRST116") {
        // PGRST116: "object not found" - this is expected on first login after signup
        this.handleAuthError(error, "fetching user profile");
      }
    }

    this.appUser.set(data as User | null);
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
      }

      this.handleAuthError(response.error as AuthError, "logging in");
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
    const { data: signUpData, error: signUpError } =
      await this.supabase.client.auth.signUp({
        email,
        password,
      });

    if (signUpError) {
      this.handleAuthError(signUpError, "registering");
      return;
    }

    if (signUpData.user) {
      const { error: insertError } = await this.supabase.client
        .from("users")
        .insert({
          auth_id: signUpData.user.id,
          name,
          email,
          role,
          status: role === "professional" ? "Pending" : "Active", // Professionals need approval
          avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
        });

      if (insertError) {
        this.handleAuthError(insertError, "creating user profile");
      } else {
        this.notificationService.addNotification(
          "Registration successful! Please check your email to verify your account."
        );
      }
    }
  }

  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    const response = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    this.handleAuthError(response.error as AuthError, "verifying OTP");
    return response;
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
