import { Injectable, computed, signal } from "@angular/core";

export interface TenantInfo {
  id: string;
  slug: string;
  subdomain?: string | null;
  status?: string;
}

@Injectable({ providedIn: "root" })
export class TenantContextService {
  private readonly _host = signal<string | null>(this.detectHost());
  private readonly _subdomain = signal<string | null>(this.detectSubdomain());
  private readonly _tenant = signal<TenantInfo | null>(null);

  readonly host = this._host.asReadonly();
  readonly subdomain = this._subdomain.asReadonly();
  readonly tenant = this._tenant.asReadonly();
  readonly tenantSlug = computed(() => this._tenant()?.slug ?? this._subdomain());

  setResolvedTenant(tenant: TenantInfo | null | undefined): void {
    if (!tenant) {
      this._tenant.set(null);
      return;
    }

    this._tenant.set({
      id: tenant.id,
      slug: tenant.slug,
      subdomain: tenant.subdomain ?? null,
      status: tenant.status,
    });
  }

  isTenantCompatible(userTenantId?: string | null, userRole?: string | null): boolean {
    if (String(userRole || "").toLowerCase() === "super_user") {
      return true;
    }

    const tenant = this._tenant();
    if (!tenant || !userTenantId) return true;
    return String(userTenantId) === String(tenant.id);
  }

  private detectSubdomain(): string | null {
    if (globalThis.window === undefined) {
      return null;
    }

    const host = (globalThis.window.location.hostname || "").toLowerCase();
    if (!host) return null;

    if (host === "localhost") {
      return null;
    }

    if (host.endsWith(".localhost")) {
      const parts = host.split(".");
      return parts[0] || null;
    }

    const parts = host.split(".");
    if (parts.length < 3) {
      return null;
    }

    return parts[0] || null;
  }

  private detectHost(): string | null {
    if (globalThis.window === undefined) {
      return null;
    }

    const host = (globalThis.window.location.hostname || "").toLowerCase();
    return host || null;
  }
}
