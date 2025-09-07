// supabase.service.ts
import { Injectable, signal } from "@angular/core";
import {
  AuthError,
  createClient,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import { environment } from "../environments/environment";

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _currentUser = signal<User | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl.toString().trim(),
      environment.supabaseAnonKey
    );

    // Inicializar com usuário atual se existir
    this.initializeCurrentUser();

    // Listen for auth changes
    this.client.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      this._currentUser.set(session?.user ?? null);
    });
  }

  async signIn(email: string, password: string) {
    console.log("Attempting login for:", email);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        return { data: null, error };
      }

      console.log("Login result:", { data, error });
      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error:", err);
      return { data: null, error: err as AuthError };
    }
  }

  get client() {
    return this.supabase;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    return { data, error };
  }

  private async initializeCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await this.client.auth.getUser();
      if (error) {
        console.error("Erro ao obter usuário inicial:", error);
        this._currentUser.set(null);
      } else {
        this._currentUser.set(user);
      }
    } catch (error) {
      console.error("Erro inesperado ao inicializar usuário:", error);
      this._currentUser.set(null);
    }
  }

  get currentUser() {
    return this._currentUser.asReadonly();
  }

  // Método auxiliar para obter o usuário atual de forma síncrona
  getCurrentUserSync(): User | null {
    return this._currentUser();
  }

  // Método auxiliar para obter o usuário atual de forma assíncrona
  async getCurrentUserAsync(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (error) {
      console.error("Erro ao obter usuário:", error);
      return null;
    }
    return user;
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }
}
