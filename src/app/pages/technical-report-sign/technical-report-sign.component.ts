
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "@/src/pipes/i18n.pipe";
import { environment } from "@/src/environments/environment";

type SignerType = "client";

type ReportResponse = {
  success: boolean;
  report?: {
    id: number;
    service_request_id: number;
    status: string | null;
    file_url: string;
    file_name: string;
    professional_signed_at?: string | null;
    client_signed_at?: string | null;
  };
  error?: string;
};

@Component({
  selector: "app-technical-report-sign",
  standalone: true,
  imports: [RouterModule, FormsModule, I18nPipe],
  templateUrl: "./technical-report-sign.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicalReportSignComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiBaseUrl = environment.production ? "" : "http://localhost:4002";

  @ViewChild("sigCanvas")
  private readonly sigCanvas?: { nativeElement: HTMLCanvasElement };

  reportId = signal<number | null>(null);
  clientToken = signal<string>("");

  loading = signal(false);
  error = signal<string>("");

  reportFileUrl = signal<string>("");
  reportFileName = signal<string>("");
  reportStatus = signal<string>("");

  otp = signal<string>("");
  otpRequested = signal(false);
  otpEmail = signal<string>("");
  otpExpiresAt = signal<string>("");

  signerType: SignerType = "client";

  isDrawing = false;

  canSubmit = computed(() => !!this.reportId() && !!this.clientToken().trim());

  constructor() {
    effect(() => {
      const idParam = this.route.snapshot.paramMap.get("id");
      const token = this.route.snapshot.queryParamMap.get("token") || "";
      const reportId = idParam ? Number(idParam) : null;

      if (!reportId || !Number.isFinite(reportId)) {
        this.error.set("reportId inválido");
        return;
      }

      this.reportId.set(reportId);
      this.clientToken.set(token);

      this.loadReport();
    });
  }

  ngAfterViewInit(): void {
    const el = this.sigCanvas?.nativeElement;
    if (!el) return;

    // Ensure canvas has a crisp backing store.
    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = el.getBoundingClientRect();
    el.width = Math.floor(rect.width * ratio);
    el.height = Math.floor(rect.height * ratio);

    const ctx = el.getContext("2d");
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#111827"; // gray-900
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }

  private getCanvasPoint(event: PointerEvent) {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onPointerDown(event: PointerEvent) {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return;
    this.isDrawing = true;

    const ctx = canvas.getContext("2d");
    const p = this.getCanvasPoint(event);
    if (!ctx || !p) return;

    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  onPointerMove(event: PointerEvent) {
    const canvas = this.sigCanvas?.nativeElement;
    if (!this.isDrawing || !canvas) return;
    const ctx = canvas.getContext("2d");
    const p = this.getCanvasPoint(event);
    if (!ctx || !p) return;

    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  onPointerUp(event: PointerEvent) {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return;
    this.isDrawing = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  clearSignature() {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  private getSignatureDataUrl(): string {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  }

  private apiUrl(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }

  async loadReport(): Promise<void> {
    const reportId = this.reportId();
    const token = this.clientToken().trim();
    if (!reportId || !token) return;

    this.loading.set(true);
    this.error.set("");
    try {
      const resp = await fetch(
        this.apiUrl(`/api/technical-reports/${reportId}?clientToken=${encodeURIComponent(token)}`)
      );
      const json = (await resp.json()) as ReportResponse;
      if (!resp.ok || !json.success || !json.report) {
        throw new Error(json.error || "Erro ao carregar relatório");
      }

      this.reportFileUrl.set(json.report.file_url);
      this.reportFileName.set(json.report.file_name);
      this.reportStatus.set(json.report.status || "generated");
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Erro ao carregar relatório");
    } finally {
      this.loading.set(false);
    }
  }

  async requestOtp(): Promise<void> {
    const reportId = this.reportId();
    const token = this.clientToken().trim();
    if (!reportId || !token) return;

    this.loading.set(true);
    this.error.set("");
    try {
      const resp = await fetch(this.apiUrl(`/api/technical-reports/${reportId}/request-otp`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerType: this.signerType, clientToken: token }),
      });
      const json = (await resp.json()) as { success: boolean; expiresAt?: string; email?: string; error?: string };
      if (!resp.ok || !json.success) {
        throw new Error(json.error || "Erro ao solicitar OTP");
      }

      this.otpRequested.set(true);
      this.otpEmail.set(json.email || "");
      this.otpExpiresAt.set(json.expiresAt || "");
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Erro ao solicitar OTP");
    } finally {
      this.loading.set(false);
    }
  }

  async submitSignature(): Promise<void> {
    const reportId = this.reportId();
    const token = this.clientToken().trim();
    const otp = this.otp().trim();
    if (!reportId || !token) return;

    if (!otp) {
      this.error.set("Informe o código (OTP)");
      return;
    }

    const signatureDataUrl = this.getSignatureDataUrl();
    if (!signatureDataUrl) {
      this.error.set("Assinatura inválida");
      return;
    }

    this.loading.set(true);
    this.error.set("");
    try {
      const resp = await fetch(this.apiUrl(`/api/technical-reports/${reportId}/submit-signature`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerType: this.signerType,
          clientToken: token,
          otp,
          signatureDataUrl,
        }),
      });

      const json = (await resp.json()) as { success: boolean; signedFileUrl?: string; status?: string; error?: string };
      if (!resp.ok || !json.success) {
        throw new Error(json.error || "Erro ao enviar assinatura");
      }

      if (json.signedFileUrl) {
        this.reportFileUrl.set(json.signedFileUrl);
      }
      if (json.status) {
        this.reportStatus.set(json.status);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Erro ao enviar assinatura");
    } finally {
      this.loading.set(false);
    }
  }
}
