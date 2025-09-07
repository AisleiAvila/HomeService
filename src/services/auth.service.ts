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
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    this.handleAuthError(error, "updating profile");
    if (data) {
      this.appUser.set(data as User);
      this.notificationService.addNotification("Profile updated successfully!");
    }
  }

  async uploadAvatar(file: File): Promise<void> {
    const user = this.appUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      this.handleAuthError(uploadError, "uploading avatar");
      return;
    }

    const { data } = this.supabase.client.storage
      .from("avatars")
      .getPublicUrl(filePath);

    if (data) {
      await this.updateUserProfile({ avatar_url: data.publicUrl });
    }
  }
}
