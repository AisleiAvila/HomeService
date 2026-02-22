// supabase.service.ts
import { Injectable, inject, signal } from "@angular/core";
import {
  AuthError,
  createClient,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import { environment } from "../environments/environment";
import { TenantContextService } from "./tenant-context.service";

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  private readonly supabase: SupabaseClient;
  private readonly _currentUser = signal<User | null>(null);
  private readonly tenantContext = inject(TenantContextService);

  private detectSubdomainFromHost(): string | null {
    if (globalThis.window === undefined) {
      return null;
    }

    const host = (globalThis.window.location.hostname || "").toLowerCase();
    if (!host || host === "localhost") {
      return null;
    }

    if (host.endsWith(".localhost")) {
      return host.split(".")[0] || null;
    }

    const parts = host.split(".");
    return parts.length >= 3 ? parts[0] || null : null;
  }

  private createTenantAwareFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});

      const tenant = this.tenantContext.tenant();
      const host = this.tenantContext.host();
      const subdomain = tenant?.subdomain || this.tenantContext.subdomain() || this.detectSubdomainFromHost();

      if (tenant?.id) {
        headers.set("x-tenant-id", String(tenant.id));
      }

      if (tenant?.slug) {
        headers.set("x-tenant-slug", String(tenant.slug));
      }

      if (subdomain) {
        headers.set("x-tenant-subdomain", String(subdomain));
      }

      if (host) {
        headers.set("x-tenant-host", String(host));
      }

      return fetch(input, {
        ...init,
        headers,
      });
    };
  }

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl.toString().trim(),
      environment.supabaseAnonKey,
      {
        global: {
          fetch: this.createTenantAwareFetch(),
        },
      }
    );

    // Listen for auth changes
    this.client.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);

      // Detectar confirmação de e-mail via link
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        console.log(
          "✅ Email confirmado via link detectado:",
          session.user.email
        );
        console.log("📧 Data de confirmação:", session.user.email_confirmed_at);

        // Verificar se há dados temporários (usuário veio de confirmação por link)
        const tempUserData = localStorage.getItem("tempUserData");
        if (tempUserData) {
          console.log(
            "🔄 Detectada confirmação via link com dados temporários"
          );
          console.log("📧 Processando confirmação via link...");

          // Emitir evento para AuthService processar
          globalThis.dispatchEvent(
            new CustomEvent("emailConfirmedViaLink", {
              detail: { user: session.user, tempData: tempUserData },
            })
          );
        }
      }

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

  // IMPORTANTE: Chamar este método no bootstrap da aplicação ou via APP_INITIALIZER
  async initializeCurrentUser() {
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
