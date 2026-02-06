import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, OnDestroy, OnInit, signal, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { I18nService } from "../../../i18n.service";
import { StockItem } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { AuthService } from "../../../services/auth.service";
import { InventoryService } from "../../../services/inventory.service";
import { NotificationService } from "../../../services/notification.service";
import { WarehouseService } from "../../../services/warehouse.service";

declare const BarcodeDetector: {
  new (options?: { formats?: string[] }): {
    detect(video: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
  };
  getSupportedFormats?: () => string[];
};

@Component({
  selector: "app-stock-intake-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./stock-intake-form.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockIntakeFormComponent implements OnInit, OnDestroy {
  warehouseService = inject(WarehouseService);
  inventoryService = inject(InventoryService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  // Input para modo de edição
  editItem = input<StockItem | null>(null);

  @ViewChild("barcodeVideo") barcodeVideo?: ElementRef<HTMLVideoElement>;

  // Signals para campos do formulário
  barcode = signal("");
  warehouseId = signal<number|null>(null);
  productName = signal("");
  quantity = signal(1);
  supplier = signal("");
  receivedAt = signal(this.formatDateTimeLocal(new Date()));
  notes = signal("");

  isSaving = signal(false);
  statusMessage = signal<string | null>(null);
  statusType = signal<"success" | "error" | "info" | null>(null);

  // Scanner
  isScanning = signal(false);
  cameraSupported = signal(!!navigator.mediaDevices?.getUserMedia);
  nativeDetectorSupported = signal(
    (globalThis as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !==
      undefined
  );
  usingFallbackScanner = signal(false);

  private stream: MediaStream | null = null;
  private detector:
    | { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> }
    | null = null;
  private scanFrameId: number | null = null;
  private zxingReader: BrowserMultiFormatReader | null = null;
  private zxingControls: IScannerControls | null = null;
  private audioContext: AudioContext | null = null;

  ngOnInit(): void {
    this.warehouseService.fetchWarehouses();

    // Se estiver editando, preenche os campos
    const item = this.editItem();
    if (item) {
      this.barcode.set(item.barcode);
      this.productName.set(item.product_name || "");
      this.quantity.set(item.quantity);
      this.supplier.set(item.supplier);
      this.receivedAt.set(this.formatDateTimeLocal(new Date(item.received_at)));
      this.notes.set(item.notes || "");
      this.warehouseId.set(item.warehouse_id);
    }
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }

  async saveToStock(): Promise<void> {
    const barcodeValue = this.barcode().trim();
    if (!barcodeValue) {
      this.setStatus("error", this.i18n.translate("barcodeRequired"));
      return;
    }
    if (!this.warehouseId()) {
      this.setStatus("error", this.i18n.translate("selectWarehouse"));
      return;
    }

    const item = this.editItem();
    this.isSaving.set(true);
    try {
      const receivedAtIso = this.toIsoFromInput(this.receivedAt());

      if (item) {
        // Modo edição
        const updated = await this.inventoryService.updateStockItem(item.id, {
          product_name: this.productName().trim() || null,
          quantity: this.quantity(),
          supplier: this.supplier().trim(),
          received_at: receivedAtIso,
          notes: this.notes().trim() || null,
          warehouse_id: this.warehouseId(),
        });
        if (updated) {
          this.notificationService.addNotification(this.i18n.translate("itemUpdatedSuccessfully"));
          this.router.navigate(['/admin/stock-intake']);
        } else {
          this.setStatus("error", this.i18n.translate("stockUpdateError"));
        }
      } else {
        // Modo criação
        const createdBy = this.authService.appUser()?.id ?? null;
        const saved = await this.inventoryService.addStockItem({
          barcode: barcodeValue,
          product_name: this.productName().trim() || null,
          quantity: this.quantity() || 1,
          supplier: this.supplier().trim() || "Worten",
          notes: this.notes().trim() || null,
          received_at: receivedAtIso,
          created_by_admin_id: createdBy,
          warehouse_id: this.warehouseId(),
        });
        if (saved) {
          this.setStatus("success", this.i18n.translate("stockSaved"));
        } else {
          this.setStatus("error", this.i18n.translate("stockSaveError"));
        }
      }
    } catch (error) {
      console.error("Erro ao salvar estoque:", error);
      this.notificationService.addNotification(this.i18n.translate("stockSaveError"));
      this.setStatus("error", this.i18n.translate("stockSaveError"));
    } finally {
      this.isSaving.set(false);
    }
  }

  cancelEdit(): void {
    this.router.navigate(['/admin/stock-intake']);
  }

  setStatus(type: "success" | "error" | "info", message: string): void {
    this.statusType.set(type);
    this.statusMessage.set(message);
  }

  async startScanning(): Promise<void> {
    if (!this.cameraSupported()) {
      this.setStatus("error", this.i18n.translate("errorCameraNotSupported"));
      return;
    }

    const isLocalhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isSecureContext && !isLocalhost) {
      this.setStatus("error", this.i18n.translate("cameraRequiresHttps"));
      return;
    }

    if (this.isScanning()) {
      return;
    }

    try {
      if (!this.barcodeVideo?.nativeElement) {
        throw new Error("Video element not available");
      }

      const video = this.barcodeVideo.nativeElement;
      this.isScanning.set(true);
      this.usingFallbackScanner.set(false);

      if (this.nativeDetectorSupported()) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        video.srcObject = this.stream;
        await video.play();

        try {
          const formats = BarcodeDetector.getSupportedFormats
            ? BarcodeDetector.getSupportedFormats()
            : ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"];
          this.detector = new BarcodeDetector({ formats });
        } catch (error) {
          console.warn("BarcodeDetector indisponível. Usando fallback.", error);
          this.stopStreamOnly();
          await this.startFallbackScan(video);
          return;
        }

        this.setStatus("info", this.i18n.translate("scannerReady"));
        this.scanLoop();
        return;
      }

      await this.startFallbackScan(video);
    } catch (error) {
      console.error("Erro ao iniciar câmera:", error);
      this.setStatus("error", this.getCameraErrorMessage(error));
      this.stopScanning();
    }
  }

  stopScanning(): void {
    if (this.scanFrameId) {
      cancelAnimationFrame(this.scanFrameId);
      this.scanFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.zxingControls) {
      this.zxingControls.stop();
      this.zxingControls = null;
    }

    if (this.zxingReader) {
      this.zxingReader = null;
    }

    if (this.barcodeVideo?.nativeElement) {
      this.barcodeVideo.nativeElement.srcObject = null;
    }

    this.isScanning.set(false);
    this.usingFallbackScanner.set(false);
  }

  private async scanLoop(): Promise<void> {
    if (!this.isScanning() || !this.detector || !this.barcodeVideo?.nativeElement) {
      return;
    }

    const video = this.barcodeVideo.nativeElement;

    if (video.readyState >= 2) {
      try {
        const barcodes = await this.detector.detect(video);
        if (barcodes.length > 0) {
          this.handleBarcode(barcodes[0].rawValue);
        }
      } catch (error) {
        console.warn("Erro ao detectar código:", error);
      }
    }

    this.scanFrameId = requestAnimationFrame(() => this.scanLoop());
  }

  private stopStreamOnly(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.barcodeVideo?.nativeElement) {
      this.barcodeVideo.nativeElement.srcObject = null;
    }
  }

  private async startFallbackScan(video: HTMLVideoElement): Promise<void> {
    this.usingFallbackScanner.set(true);
    this.zxingReader = new BrowserMultiFormatReader();
    this.setStatus("info", this.i18n.translate("scannerReady"));
    this.zxingControls = await this.zxingReader.decodeFromConstraints(
      { video: { facingMode: "environment" } },
      video,
      (result, error) => {
        if (result) {
          this.handleBarcode(result.getText());
        } else if (error && error.name !== "NotFoundException") {
          console.warn("Erro ao detectar código:", error);
        }
      }
    );
  }

  private getCameraErrorMessage(error: unknown): string {
    const err = error as { name?: string };
    const codeSuffix = err?.name ? ` (${err.name})` : "";

    switch (err?.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return `${this.i18n.translate("errorCameraPermissionDenied")}${codeSuffix}`;
      case "NotFoundError":
      case "DevicesNotFoundError":
        return `${this.i18n.translate("errorNoCameraFound")}${codeSuffix}`;
      case "NotReadableError":
      case "TrackStartError":
        return `${this.i18n.translate("errorCameraInUse")}${codeSuffix}`;
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return `${this.i18n.translate("errorCameraConstraints")}${codeSuffix}`;
      case "SecurityError":
        return `${this.i18n.translate("cameraRequiresHttps")}${codeSuffix}`;
      default:
        return `${this.i18n.translate("errorAccessingCamera")}${codeSuffix}`;
    }
  }

  private handleBarcode(rawValue?: string | null): void {
    const trimmed = rawValue?.trim();
    if (trimmed && trimmed !== this.barcode()) {
      this.barcode.set(trimmed);
      this.setStatus("success", this.i18n.translate("barcodeDetected"));
      this.playBeep();

      // Para evitar leituras repetidas, para o scanner após detectar
      this.stopScanning();
    }
  }

  private playBeep(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.12;

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.12);
    } catch (error) {
      console.warn("Não foi possível reproduzir aviso sonoro:", error);
    }
  }

  formatDateTimeLocal(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  toIsoFromInput(input: string): string {
    if (!input) {
      return new Date().toISOString();
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }
    return parsed.toISOString();
  }
}
