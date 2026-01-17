import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

type SessionFailurePayload = {
  ts?: string;
  source?: string;
  status?: number;
  reason?: string;
  serverNow?: string | null;
  storedExpiresAt?: string | null;
  minutesUntilExpiry?: number | null;
  storedUserEmail?: string | null;
};

@Component({
  selector: "app-session-diagnostics-banner",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="payload() as p">
      <div class="fixed top-3 left-3 right-3 z-[10000]">
        <div
          class="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 text-amber-900 shadow-lg dark:border-amber-900/40 dark:bg-amber-950/60 dark:text-amber-100"
          role="alert"
          aria-live="polite"
        >
          <div class="flex items-start gap-3 p-4">
            <div class="mt-0.5">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div class="min-w-0 flex-1">
              <div class="font-semibold">Sessão encerrada (diagnóstico)</div>
              <div class="mt-1 text-sm break-words">
                <span class="font-medium">Motivo:</span> {{ p.reason || 'Desconhecido' }}
              </div>

              <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs opacity-90">
                <div *ngIf="p.status !== undefined && p.status !== null">
                  <span class="font-medium">HTTP:</span> {{ p.status }}
                </div>
                <div *ngIf="p.source">
                  <span class="font-medium">Origem:</span> {{ p.source }}
                </div>
                <div *ngIf="p.ts">
                  <span class="font-medium">Cliente:</span> {{ p.ts }}
                </div>
                <div *ngIf="p.serverNow">
                  <span class="font-medium">Servidor:</span> {{ p.serverNow }}
                </div>
                <div *ngIf="p.storedExpiresAt">
                  <span class="font-medium">Expira em:</span> {{ p.storedExpiresAt }}
                </div>
                <div *ngIf="p.minutesUntilExpiry !== undefined && p.minutesUntilExpiry !== null">
                  <span class="font-medium">Min até expirar:</span> {{ p.minutesUntilExpiry }}
                </div>
                <div *ngIf="p.storedUserEmail">
                  <span class="font-medium">Usuário:</span> {{ p.storedUserEmail }}
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700"
                  (click)="copyDetails()"
                >
                  Copiar detalhes
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md bg-white/60 hover:bg-white border border-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-amber-900/40"
                  (click)="dismiss()"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md bg-transparent hover:bg-amber-100 border border-amber-200 dark:hover:bg-amber-900/30 dark:border-amber-900/40"
                  (click)="clear()"
                  title="Remove o diagnóstico salvo"
                >
                  Limpar
                </button>
              </div>

              <div *ngIf="copied()" class="mt-2 text-xs">Copiado.</div>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionDiagnosticsBannerComponent {
  private readonly storageKey = "natangeneralservice_last_session_error";
  private readonly destroyRef = inject(DestroyRef);

  payload = signal<SessionFailurePayload | null>(null);
  copied = signal(false);
  dismissed = signal(false);

  constructor() {
    this.loadFromStorage();

    const onFailure = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as SessionFailurePayload | undefined;
      if (detail) {
        this.payload.set(detail);
        this.dismissed.set(false);
      } else {
        this.loadFromStorage();
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === this.storageKey) {
        this.loadFromStorage();
      }
    };

    globalThis.addEventListener("ngs-session-failure", onFailure as EventListener);
    globalThis.addEventListener("storage", onStorage);

    this.destroyRef.onDestroy(() => {
      globalThis.removeEventListener("ngs-session-failure", onFailure as EventListener);
      globalThis.removeEventListener("storage", onStorage);
    });
  }

  private loadFromStorage(): void {
    if (this.dismissed()) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.payload.set(null);
        return;
      }
      const parsed = JSON.parse(raw) as SessionFailurePayload;
      this.payload.set(parsed);
    } catch {
      this.payload.set(null);
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.payload.set(null);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
    this.dismissed.set(false);
    this.payload.set(null);
  }

  async copyDetails(): Promise<void> {
    const p = this.payload();
    if (!p) return;

    const text = JSON.stringify(p, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      globalThis.setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback: try to use a temporary textarea (works on some mobile browsers)
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        this.copied.set(true);
        globalThis.setTimeout(() => this.copied.set(false), 2000);
      } catch {
        // ignore
      }
    }
  }
}
