import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  AfterViewChecked,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import type {
  ServiceRequest,
  ServiceRequestOrigin,
  TechnicalReportRecord,
} from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { DataService } from "../../services/data.service";
import {
  TechnicalReportPdfService,
  type TechnicalReportOriginKey,
  type TechnicalReportData,
  type WortenVerdeMaterialItem,
} from "../../services/technical-report-pdf.service";
import { TechnicalReportStorageService } from "../../services/technical-report-storage.service";
import { AuthService } from "../../services/auth.service";
import {
  getTechnicalReportOriginKey,
  getTechnicalReportOriginLabel,
} from "../../utils/technical-report-origin.util";

@Component({
  selector: "app-technical-report-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./technical-report-modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicalReportModalComponent implements AfterViewChecked {
  request = input.required<ServiceRequest>();
  show = input<boolean>(false);

  dismiss = output<void>();

  private readonly pdfService = inject(TechnicalReportPdfService);
  private readonly storageService = inject(TechnicalReportStorageService);
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly originsById = computed(() => {
    const map = new Map<number, ServiceRequestOrigin>();
    const origins = this.dataService.origins();
    for (const origin of origins || []) {
      map.set(origin.id, origin);
    }
    return map;
  });

  modalRef?: HTMLDialogElement;

  originKey = computed<TechnicalReportOriginKey | null>(() =>
    getTechnicalReportOriginKey(this.request(), this.originsById())
  );

  private readonly isWortenOrigin = computed(() => this.request().origin_id === 2);

  selectedWortenVariant = signal<"worten_verde" | "worten_azul" | null>(null);

  activeOriginKey = computed<TechnicalReportOriginKey | null>(() => {
    const resolved = this.originKey();
    if (resolved) return resolved;
    if (this.isWortenOrigin()) return this.selectedWortenVariant();
    return null;
  });

  needsWortenVariantSelection = computed(() => this.isWortenOrigin() && !this.activeOriginKey());

  originLabel = computed(() => {
    const key = this.activeOriginKey();
    if (key) return getTechnicalReportOriginLabel(key);
    if (this.isWortenOrigin()) return "Worten";
    return "";
  });

  // Worten Verde
  verdeProcess = signal("");
  verdeServiceType = signal<
    | "Instalação"
    | "Reparação"
    | "Garantia"
    | "Extensão de Garantia"
    | "Orçamento"
    | "SAT24"
  >("Instalação");
  verdeTypology = signal("");
  verdeBrand = signal("");
  verdeModel = signal("");
  verdeSerialNumber = signal("");
  verdeProductCode = signal("");
  verdeReportedFailure = signal("");
  verdeOldItemCollected = signal(false);
  verdeItemPickedUpAtWorkshop = signal(false);
  verdeTechnicalNotes = signal("");
  verdeMaterials = signal<WortenVerdeMaterialItem[]>([]);

  // Worten Azul
  azulInvoiceNumber = signal("");
  azulServiceNumber = signal("");
  azulReportNotes = signal("");

  // Rádio Popular
  radioServiceNote = signal("");
  radioInstallation = signal("");
  radioWorkDescription = signal("");
  radioExtraServicesInstalled = signal("");

  generating = signal(false);
  error = signal<string>("");

  generatedReport = signal<TechnicalReportRecord | null>(null);

  clientLinkGenerating = signal(false);
  clientLinkError = signal<string>("");
  clientSignToken = signal<string>("");
  clientSignUrl = signal<string>("");

  onModalKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && !this.generating()) {
      this.handleClose();
    }
  }

  ngAfterViewChecked() {
    if (this.show() && this.modalRef) {
      this.modalRef.focus();
    }

    if (this.dataService.origins().length === 0) {
      this.dataService.fetchOrigins();
    }
  }

  handleClose() {
    if (this.generating()) return;
    this.error.set("");
    this.generatedReport.set(null);
    this.clientLinkError.set("");
    this.clientSignToken.set("");
    this.clientSignUrl.set("");
    this.dismiss.emit();
  }

  private apiUrl(path: string): string {
    const isLocal =
      globalThis.location.hostname === "localhost" ||
      globalThis.location.hostname === "127.0.0.1";
    const base = isLocal ? "http://localhost:4002" : "";
    return `${base}${path}`;
  }

  private buildClientSignUrl(reportId: number, token: string): string {
    const origin = globalThis.location.origin;
    return `${origin}/technical-reports/${reportId}/sign?token=${encodeURIComponent(token)}`;
  }

  async handleGenerateClientLink(): Promise<void> {
    if (this.clientLinkGenerating()) return;
    this.clientLinkError.set("");

    const report = this.generatedReport();
    if (!report?.id) {
      this.clientLinkError.set("Gere o Relatório Técnico primeiro.");
      return;
    }

    const token = this.authService.getCustomSessionToken();
    if (!token) {
      this.clientLinkError.set("Sessão inválida. Faça login novamente.");
      return;
    }

    this.clientLinkGenerating.set(true);
    try {
      const resp = await fetch(this.apiUrl(`/api/technical-reports/${report.id}/client-link`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const json: any = await resp.json().catch(() => ({}));
      const clientToken = json?.token || json?.clientToken;
      if (!resp.ok || !json?.success || !clientToken) {
        throw new Error(json?.error || "Falha ao gerar link do cliente.");
      }

      this.clientSignToken.set(String(clientToken));
      this.clientSignUrl.set(this.buildClientSignUrl(report.id, String(clientToken)));
    } catch (e) {
      console.error("Erro ao gerar link do cliente:", e);
      const message = e instanceof Error ? e.message : "Falha ao gerar link do cliente.";
      this.clientLinkError.set(message);
    } finally {
      this.clientLinkGenerating.set(false);
    }
  }

  async openClientSigningInApp(): Promise<void> {
    const report = this.generatedReport();
    const token = this.clientSignToken().trim();
    if (!report?.id || !token) return;

    await this.router.navigate(["/technical-reports", report.id, "sign"], {
      queryParams: { token },
    });

    this.dismiss.emit();
  }

  async copyClientSignUrl(): Promise<void> {
    const url = this.clientSignUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // best-effort: clipboard may be blocked in some contexts
    }
  }

  addMaterialItem() {
    this.verdeMaterials.update((items) => [
      ...(items || []),
      { description: "", totalWithVat: null },
    ]);
  }

  removeMaterialItem(index: number) {
    this.verdeMaterials.update((items) =>
      (items || []).filter((_, i) => i !== index)
    );
  }

  updateMaterialDescription(index: number, value: string) {
    this.verdeMaterials.update((items) =>
      (items || []).map((it, i) => (i === index ? { ...it, description: value } : it))
    );
  }

  updateMaterialTotal(index: number, value: string) {
    const parsed = value === "" ? null : Number(value);
    const nextValue = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    this.verdeMaterials.update((items) =>
      (items || []).map((it, i) =>
        i === index ? { ...it, totalWithVat: nextValue } : it
      )
    );
  }

  private validateWortenVerde(): { ok: boolean; message?: string } {
    if (!this.verdeProcess().trim()) return { ok: false, message: "Processo é obrigatório." };
    if (!this.verdeBrand().trim()) return { ok: false, message: "Marca é obrigatória." };
    if (!this.verdeModel().trim()) return { ok: false, message: "Modelo é obrigatório." };
    if (!this.verdeSerialNumber().trim()) return { ok: false, message: "Número de Série é obrigatório." };
    if (!this.verdeReportedFailure().trim()) return { ok: false, message: "Avaria Reportada é obrigatória." };
    if (!this.verdeTechnicalNotes().trim()) return { ok: false, message: "Observações técnicas são obrigatórias." };

    const materials = this.verdeMaterials();
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      if (!m.description.trim()) {
        return { ok: false, message: `Material #${i + 1}: Descrição é obrigatória.` };
      }
      if (m.totalWithVat === null || !Number.isFinite(m.totalWithVat)) {
        return { ok: false, message: `Material #${i + 1}: Total com IVA é obrigatório.` };
      }
    }

    return { ok: true };
  }

  private validateWortenAzul(): { ok: boolean; message?: string } {
    if (!this.azulInvoiceNumber().trim()) return { ok: false, message: "Número da Fatura é obrigatório." };
    if (!this.azulServiceNumber().trim()) return { ok: false, message: "Número do Serviço é obrigatório." };
    if (!this.azulReportNotes().trim()) return { ok: false, message: "Relatório Técnico / Observações é obrigatório." };
    return { ok: true };
  }

  private validateRadioPopular(): { ok: boolean; message?: string } {
    if (!this.radioServiceNote().trim()) return { ok: false, message: "Nota Serviço é obrigatória." };
    if (!this.radioInstallation().trim()) return { ok: false, message: "Instalação é obrigatória." };
    if (!this.radioWorkDescription().trim()) return { ok: false, message: "Descrição dos trabalhos é obrigatória." };
    return { ok: true };
  }

  private validate(): { ok: boolean; message?: string } {
    const origin = this.activeOriginKey();
    if (!origin) {
      if (this.isWortenOrigin()) {
        return { ok: false, message: "Selecione se o relatório é Worten Verde ou Worten Azul." };
      }
      return { ok: false, message: "Origem não suportada para Relatório Técnico." };
    }

    switch (origin) {
      case "worten_verde":
        return this.validateWortenVerde();
      case "worten_azul":
        return this.validateWortenAzul();
      case "radio_popular":
        return this.validateRadioPopular();
    }
  }

  async handleGenerate(): Promise<void> {
    if (this.generating()) return;
    this.error.set("");
    this.clientLinkError.set("");
    this.clientSignToken.set("");
    this.clientSignUrl.set("");
    this.generatedReport.set(null);

    const validation = this.validate();
    if (!validation.ok) {
      this.error.set(validation.message || "Verifique os campos obrigatórios.");
      return;
    }

    const origin = this.activeOriginKey();
    if (!origin) {
      this.error.set(
        this.isWortenOrigin()
          ? "Selecione se o relatório é Worten Verde ou Worten Azul."
          : "Origem não suportada para Relatório Técnico."
      );
      return;
    }

    let payload: TechnicalReportData;
    switch (origin) {
      case "worten_verde":
        payload = {
          origin,
          data: {
            process: this.verdeProcess(),
            serviceType: this.verdeServiceType(),
            typology: this.verdeTypology(),
            brand: this.verdeBrand(),
            model: this.verdeModel(),
            serialNumber: this.verdeSerialNumber(),
            productCode: this.verdeProductCode(),
            reportedFailure: this.verdeReportedFailure(),
            oldItemCollected: this.verdeOldItemCollected(),
            itemPickedUpAtWorkshop: this.verdeItemPickedUpAtWorkshop(),
            technicalNotes: this.verdeTechnicalNotes(),
            materials: this.verdeMaterials(),
          },
        };
        break;
      case "worten_azul":
        payload = {
          origin,
          data: {
            invoiceNumber: this.azulInvoiceNumber(),
            serviceNumber: this.azulServiceNumber(),
            reportNotes: this.azulReportNotes(),
          },
        };
        break;
      case "radio_popular":
        payload = {
          origin,
          data: {
            serviceNote: this.radioServiceNote(),
            installation: this.radioInstallation(),
            workDescription: this.radioWorkDescription(),
            extraServicesInstalled: this.radioExtraServicesInstalled(),
          },
        };
        break;
    }

    this.generating.set(true);
    try {
      const report = await this.storageService.generatePersistAndDownload(this.request(), payload);
      this.generatedReport.set(report);
    } catch (e) {
      console.error("Erro ao gerar Relatório Técnico:", e);
      const message = e instanceof Error ? e.message : "Erro ao gerar o PDF. Tente novamente.";
      this.error.set(message);
    } finally {
      this.generating.set(false);
    }
  }
}
