import { Injectable } from "@angular/core";
import type { ServiceRequest } from "../models/maintenance.models";

export type TechnicalReportOriginKey =
  | "worten_verde"
  | "worten_azul"
  | "radio_popular";

export interface WortenVerdeMaterialItem {
  description: string;
  totalWithVat: number | null;
}

export interface WortenVerdeReportData {
  process: string;
  serviceType:
    | "Instalação"
    | "Reparação"
    | "Garantia"
    | "Extensão de Garantia"
    | "Orçamento"
    | "SAT24";
  typology: string;
  brand: string;
  model: string;
  serialNumber: string;
  productCode: string;
  reportedFailure: string;
  oldItemCollected: boolean;
  itemPickedUpAtWorkshop: boolean;
  technicalNotes: string;
  materials: WortenVerdeMaterialItem[];
}

export interface WortenAzulReportData {
  invoiceNumber: string;
  serviceNumber: string;
  reportNotes: string;
}

export interface RadioPopularReportData {
  serviceNote: string;
  installation: string;
  workDescription: string;
  extraServicesInstalled: string;
}

export type TechnicalReportData =
  | { origin: "worten_verde"; data: WortenVerdeReportData }
  | { origin: "worten_azul"; data: WortenAzulReportData }
  | { origin: "radio_popular"; data: RadioPopularReportData };

export interface TechnicalReportPdfOptions {
  professionalSignatureDataUrl?: string;
  professionalName?: string;
  professionalSignedAt?: Date;

  clientSignatureDataUrl?: string;
  clientName?: string;
  clientSignedAt?: Date;
}

@Injectable({ providedIn: "root" })
export class TechnicalReportPdfService {
  async generateAndDownload(
    request: ServiceRequest,
    payload: TechnicalReportData,
    options?: TechnicalReportPdfOptions
  ): Promise<void> {
    const { doc, fileName } = await this.generateDocument(request, payload, options);
    doc.save(fileName);
  }

  async generatePdfBlob(
    request: ServiceRequest,
    payload: TechnicalReportData,
    options?: TechnicalReportPdfOptions
  ): Promise<{ blob: Blob; fileName: string; issuedAt: Date }> {
    const { doc, fileName, issuedAt } = await this.generateDocument(request, payload, options);
    const blob: Blob = doc.output("blob");
    return { blob, fileName, issuedAt };
  }

  private async generateDocument(
    request: ServiceRequest,
    payload: TechnicalReportData,
    options?: TechnicalReportPdfOptions
  ): Promise<{ doc: any; fileName: string; issuedAt: Date }> {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const autoTable: any =
      (autoTableModule as any).default ?? (autoTableModule as any).autoTable;

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const originLabel = this.getOriginLabel(payload.origin);
    const issuedAt = new Date();

    // Try to use a background PDF template if it exists.
    // Place template PDFs in: src/assets/technical-report-templates/
    // Expected filenames:
    // - worten-formulario.pdf (Worten Resolve - Verde)
    // - worten-azul-formulario.pdf (Worten Resolve - Azul)
    // - radio-popular-formulario.pdf
    await this.tryAddTemplateBackground(doc, payload.origin);

    // Brand header (specific requirements per origin)
    const header = await this.resolveHeaderImage(doc, payload.origin);
    if (header) this.drawHeaderImage(doc, header);
    const headerBaseY = header ? header.heightMm + 6 : 16;

    // Fallback/simple layout (also overlays on top of template backgrounds)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Relatório Técnico", 12, headerBaseY);

    doc.setFontSize(9);
    doc.text(`Origem: ${originLabel}`, 12, headerBaseY + 6);
    doc.text(`Serviço ID: ${String(request.id)}`, 12, headerBaseY + 11);
    doc.text(`Data: ${issuedAt.toLocaleDateString("pt-PT")}`, 12, headerBaseY + 16);

    let y = Math.max(40, headerBaseY + 24);

    const writeLabelValue = (label: string, value: string) => {
      doc.setFont(undefined, "bold");
      doc.text(label, 12, y);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(value || "—", 180);
      doc.text(lines, 55, y);
      y += Math.max(6, lines.length * 5);
    };

    const writeSectionTitle = (title: string) => {
      y += 2;
      doc.setFont(undefined, "bold");
      doc.text(title, 12, y);
      doc.setFont(undefined, "normal");
      y += 6;
    };

    if (payload.origin === "worten_verde") {
      const d = payload.data;
      writeLabelValue("Processo:", d.process);
      writeLabelValue("Tipo de Serviço:", d.serviceType);
      writeLabelValue("Tipologia:", d.typology);
      writeLabelValue("Marca:", d.brand);
      writeLabelValue("Modelo:", d.model);
      writeLabelValue("Número de Série:", d.serialNumber);
      writeLabelValue("Código do Produto:", d.productCode);
      writeLabelValue("Avaria Reportada:", d.reportedFailure);
      writeLabelValue("Artigo antigo recolhido?:", d.oldItemCollected ? "Sim" : "Não");
      writeLabelValue("Artigo levantado oficina?:", d.itemPickedUpAtWorkshop ? "Sim" : "Não");
      writeLabelValue("Observações técnicas:", d.technicalNotes);

      if (d.materials.length > 0) {
        y += 2;
        doc.setFont(undefined, "bold");
        doc.text("Material", 12, y);
        doc.setFont(undefined, "normal");
        y += 3;

        const marginTop = header ? Math.max(header.heightMm + 8, 10) : 10;

        autoTable(doc, {
          startY: y,
          head: [["Descrição", "Total c/ IVA"]],
          body: d.materials.map((m) => [
            m.description || "",
            m.totalWithVat !== null && m.totalWithVat !== undefined
              ? new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                }).format(m.totalWithVat)
              : "",
          ]),
          margin: { left: 12, right: 12, top: marginTop, bottom: 14 },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [245, 245, 245], textColor: 0 },
          didDrawPage: () => {
            if (header) this.drawHeaderImage(doc, header);
          },
        });
      }
    }

    if (payload.origin === "worten_azul") {
      const d = payload.data;
      writeLabelValue("Número da Fatura:", d.invoiceNumber);
      writeLabelValue("Número do Serviço:", d.serviceNumber);
      writeLabelValue("Relatório Técnico / Observações:", d.reportNotes);
    }

    if (payload.origin === "radio_popular") {
      const d = payload.data;
      const street = (request.street_manual || request.street || "").trim();
      const streetNumber = (request.street_number || "").trim();
      const complement = (request.complement || "").trim();
      const addressParts = [street, streetNumber, complement].filter(Boolean);
      const addressLine =
        addressParts.length > 0
          ? addressParts.join(", ")
          : (request.client_address || "").trim();

      writeSectionTitle("DADOS DO CLIENTE");
      writeLabelValue("NOME:", (request.client_name || "").trim());
      writeLabelValue("NOTA SERVIÇO:", d.serviceNote);
      writeLabelValue("MORADA:", addressLine);
      writeLabelValue("CÓDIGO POSTAL:", (request.zip_code || "").trim());
      writeLabelValue("LOCALIDADE:", (request.city || "").trim());
      writeLabelValue("TEL:", (request.client_phone || "").trim());
      writeLabelValue("EMAIL:", (request.email_client || "").trim());

      writeSectionTitle("DADOS DO SERVIÇO");
      writeLabelValue("INSTALAÇÃO:", d.installation);
      writeLabelValue("DESCRIÇÃO DOS TRABALHOS:", d.workDescription);
      writeLabelValue("SERVIÇOS EXTRAS INSTALADOS:", d.extraServicesInstalled);
    }


    // Desenhar assinaturas primeiro
    this.addClientSignature(doc, {
      clientSignatureDataUrl: options?.clientSignatureDataUrl,
      clientName: options?.clientName,
      clientSignedAt: options?.clientSignedAt ?? issuedAt,
    });

    this.addProfessionalSignature(doc, {
      professionalSignatureDataUrl: options?.professionalSignatureDataUrl,
      professionalName: options?.professionalName,
      professionalSignedAt: options?.professionalSignedAt ?? issuedAt,
    });

    // Adicionar bloco Rádio Popular abaixo das assinaturas, sem sobreposição
    if (payload.origin === "radio_popular") {
      const rpText = [
        "Serviço de Apoio ao Cliente RP",
        "Telefone: 22 040 30 40 (chamada para a rede fixa nacional)",
        "e-mail: cliente@radiopopular.pt   www.radiopopular.pt",
        "", // linha em branco
        "SERVIÇOS CENTRAIS",
        "Aguda Parque - Largo de Arcozelo, nº 76, Edifício E - 4410-455 Arcozelo, V. N. Gaia",
        "T. 229 409 600 - F. 229 409 601",
        "www.radiopopular.pt",
        "", // linha em branco
        "RADIO POPULAR ELETRODOMÉSTICOS, S.A. | CONTRIBUINTE 500 674 205 | CAPITAL SOCIAL 1.497.000 EUROS | INSC. NA C.R.C. MAIA SOB Nº 500 674 205"
      ];
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 12;
      const lineHeight = 4;
      const totalLines = rpText.length;
      const blockHeight = totalLines * lineHeight;
      // Assinaturas sempre na posição padrão (próximo ao rodapé)
      const signatureBoxTop = pageHeight - 40;
      const signatureBoxBottom = signatureBoxTop + 22;
      // Bloco Rádio Popular abaixo das assinaturas
      let y = signatureBoxBottom + 6;
      // Se não couber, "colar" ao rodapé, mas nunca desenhar acima das assinaturas
      if (y + blockHeight > pageHeight - 10) {
        y = Math.max(signatureBoxBottom + 2, pageHeight - 10 - blockHeight);
      }
      // Se ainda não couber, reduzir espaçamento ao mínimo possível após assinaturas
      if (y < signatureBoxBottom + 2) {
        y = signatureBoxBottom + 2;
      }
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      for (const line of rpText) {
        if (line === "") {
          y += lineHeight;
        } else {
          doc.text(line, leftMargin, y, { align: "left" });
          y += lineHeight;
        }
      }
      doc.setTextColor(0, 0, 0);
    }

    const fileName = this.buildFileName(payload.origin, request.id, issuedAt);
    return { doc, fileName, issuedAt };
  }

  private addProfessionalSignature(doc: any, options: TechnicalReportPdfOptions): void {
    const signatureDataUrl = options.professionalSignatureDataUrl?.trim();
    if (!signatureDataUrl) return;

    // Canvas is expected to be PNG, but accept other image types defensively.
    if (!signatureDataUrl.startsWith("data:image/")) {
      throw new Error("Assinatura inválida (formato não suportado). Use PNG.");
    }

    const pageCount = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 1;
    if (typeof doc.setPage === "function") doc.setPage(pageCount);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const signedAt = options.professionalSignedAt ?? new Date();
    const signedAtLabel = signedAt.toLocaleString("pt-PT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const name = (options.professionalName || "").trim() || "—";

    const boxW = 80;
    const boxH = 22;
    // Subir a caixa se for Rádio Popular para liberar espaço para o bloco
    const blockHeight = 38; // Aproximadamente o bloco de textos Rádio Popular (9 linhas * 4 + margem)
    const isRadioPopular = (options as any)?.origin === 'radio_popular';
    // Se Rádio Popular, mover as caixas mais para cima (ex: 32mm acima do padrão)
    const boxY = isRadioPopular ? pageHeight - 40 - blockHeight - 32 : pageHeight - 40;

    const x = pageWidth - 12 - boxW;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(`Data: ${signedAtLabel}`, x, boxY - 10);
    doc.text(`Profissional: ${name}`, x, boxY - 5);

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Assinatura:", x, boxY - 1);

    doc.setDrawColor(180);
    doc.rect(x, boxY, boxW, boxH);

    // Add the signature image inside the box.
    this.addImageDataUrl(doc, signatureDataUrl, x + 2, boxY + 2, boxW - 4, boxH - 4);
  }

  private addClientSignature(doc: any, options: TechnicalReportPdfOptions): void {
    const signatureDataUrl = options.clientSignatureDataUrl?.trim();
    if (!signatureDataUrl) return;

    if (!signatureDataUrl.startsWith("data:image/")) {
      throw new Error("Assinatura do cliente inválida (formato não suportado). Use PNG.");
    }

    const pageCount = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 1;
    if (typeof doc.setPage === "function") doc.setPage(pageCount);

    const pageHeight = doc.internal.pageSize.getHeight();

    const signedAt = options.clientSignedAt ?? new Date();
    const signedAtLabel = signedAt.toLocaleString("pt-PT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const name = (options.clientName || "").trim() || "—";

    const x = 12;
    const boxW = 80;
    const boxH = 22;
    // Subir a caixa se for Rádio Popular para liberar espaço para o bloco
    const blockHeight = 38; // Aproximadamente o bloco de textos Rádio Popular (9 linhas * 4 + margem)
    const isRadioPopular = (options as any)?.origin === 'radio_popular';
    // Se Rádio Popular, mover as caixas mais para cima (ex: 32mm acima do padrão)
    const boxY = isRadioPopular ? pageHeight - 40 - blockHeight - 32 : pageHeight - 40;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(`Data: ${signedAtLabel}`, x, boxY - 10);
    doc.text(`Cliente: ${name}`, x, boxY - 5);

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Assinatura:", x, boxY - 1);

    doc.setDrawColor(180);
    doc.rect(x, boxY, boxW, boxH);
    this.addImageDataUrl(doc, signatureDataUrl, x + 2, boxY + 2, boxW - 4, boxH - 4);
  }

  private getOriginLabel(origin: TechnicalReportOriginKey): string {
    switch (origin) {
      case "worten_verde":
        return "Worten Resolve (Verde)";
      case "worten_azul":
        return "Worten Resolve (Azul)";
      case "radio_popular":
        return "Rádio Popular";
    }
  }

  private sanitizeFileName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[ -\s()]+/g, '_')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^A-Za-z0-9_]/g, '_') // Substitui qualquer coisa que não seja letra, número ou _ por _
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') // Remove underscores do início/fim
      .trim();
  }

  private buildFileName(origin: TechnicalReportOriginKey, requestId: number, issuedAt: Date): string {
    const yyyy = issuedAt.getFullYear();
    const mm = String(issuedAt.getMonth() + 1).padStart(2, "0");
    const dd = String(issuedAt.getDate()).padStart(2, "0");

    const originPart = this.getOriginLabel(origin);
    const rawName = `Relatorio_${originPart}_${requestId}_${yyyy}${mm}${dd}.pdf`;
    return this.sanitizeFileName(rawName);
  }

  private async tryAddTemplateBackground(doc: any, origin: TechnicalReportOriginKey): Promise<void> {
    const pdfTemplateFile = this.getTemplatePdfFile(origin);
    const pdfUrl = `assets/technical-report-templates/${pdfTemplateFile}`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const pdfAsPngDataUrl = await this.tryRenderPdfFirstPageAsPngDataUrl(pdfUrl);
    if (pdfAsPngDataUrl) {
      this.addImageDataUrl(doc, pdfAsPngDataUrl, 0, 0, pageWidth, pageHeight);
      return;
    }

    // Backward compatible fallback: allow PNG templates too.
    let pngFallback: string;
    switch (origin) {
      case "worten_verde":
        pngFallback = "worten-verde.png";
        break;
      case "worten_azul":
        pngFallback = "worten-azul.png";
        break;
      case "radio_popular":
        pngFallback = "radio-popular.png";
        break;
    }

    const pngUrl = `assets/technical-report-templates/${pngFallback}`;
    const pngDataUrl = await this.tryLoadImageAsDataUrl(pngUrl);
    if (!pngDataUrl) return;
    this.addImageDataUrl(doc, pngDataUrl, 0, 0, pageWidth, pageHeight);
  }

  private getTemplatePdfFile(origin: TechnicalReportOriginKey): string {
    switch (origin) {
      case "worten_verde":
        return "worten-formulario.pdf";
      case "worten_azul":
        return "worten-azul-formulario.pdf";
      case "radio_popular":
        return "radio-popular-formulario.pdf";
    }
  }

  private async resolveHeaderImage(
    doc: any,
    origin: TechnicalReportOriginKey
  ): Promise<{ dataUrl: string; heightMm: number } | null> {
    let candidates: string[] | null = null;
    switch (origin) {
      case "worten_verde":
        candidates = ["assets/Header_Worten_Green.png", "src/assets/Header_Worten_Green.png"];
        break;
      case "worten_azul":
        candidates = ["assets/Header_Worten_Blue.png", "src/assets/Header_Worten_Blue.png"];
        break;
      case "radio_popular":
        candidates = [
          "assets/Header_Radio_Popular_Blue.png",
          "src/assets/Header_Radio_Popular_Blue.png",
        ];
        break;
      default:
        return null;
    }

    let dataUrl: string | null = null;
    for (const url of candidates) {
      dataUrl = await this.tryLoadImageAsDataUrl(url);
      if (dataUrl) break;
    }
    if (!dataUrl) return null;

    const pageWidth = doc.internal.pageSize.getWidth();

    // Preserve aspect ratio when possible.
    let targetHeight = 22;
    try {
      const props = doc.getImageProperties?.(dataUrl);
      if (props?.width && props?.height) {
        targetHeight = (props.height * pageWidth) / props.width;
      }
    } catch {
      // Ignore and fallback to a sensible default height.
    }

    // Avoid taking too much vertical space.
    const heightMm = Math.min(Math.max(targetHeight, 16), 32);
    return { dataUrl, heightMm };
  }

  private drawHeaderImage(doc: any, header: { dataUrl: string; heightMm: number }): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    this.addImageDataUrl(doc, header.dataUrl, 0, 0, pageWidth, header.heightMm);
  }

  private addImageDataUrl(
    doc: any,
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const base64 = this.getBase64FromDataUrl(dataUrl);
    if (!base64) return;

    const format = this.getImageFormatFromDataUrl(dataUrl, base64);
    try {
      doc.addImage(dataUrl, format, x, y, width, height, undefined, "FAST");
    } catch (error) {
      if (format === "PNG") {
        try {
          doc.addImage(dataUrl, "JPEG", x, y, width, height, undefined, "FAST");
          return;
        } catch {
          // ignore and surface original error below
        }
      }
      throw error;
    }
  }

  private getImageFormatFromDataUrl(
    dataUrl: string,
    base64?: string
  ): "PNG" | "JPEG" {
    const trimmed = (base64 || this.getBase64FromDataUrl(dataUrl) || "").trim();
    if (trimmed.startsWith("iVBORw0KGgo")) return "PNG";
    if (trimmed.startsWith("/9j/")) return "JPEG";

    const match = /^data:image\/(png|jpe?g)/i.exec(dataUrl);
    if (!match) return "PNG";
    const raw = match[1].toLowerCase();
    return raw === "png" ? "PNG" : "JPEG";
  }

  private getBase64FromDataUrl(dataUrl: string): string | null {
    if (!dataUrl.startsWith("data:image/")) return null;
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex < 0) return null;
    const base64 = dataUrl.slice(commaIndex + 1).trim();
    return base64.length > 0 ? base64 : null;
  }

  private async tryRenderPdfFirstPageAsPngDataUrl(url: string): Promise<string | null> {
    // Avoid attempting in non-browser contexts.
    if (globalThis.window === undefined || globalThis.document === undefined) return null;

    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;

      const arrayBuffer = await resp.arrayBuffer();

      // Use legacy build to reduce bundler/worker friction.
      const pdfjsSpecifier = "pdfjs-dist/legacy/build/pdf.mjs";
      const pdfjsLib: any = await import(
        /* @vite-ignore */ pdfjsSpecifier
      );

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true });
      const pdf = await loadingTask.promise;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;

      // Cleanup is best-effort.
      try {
        page.cleanup();
      } catch {
        // ignore
      }

      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  private async tryLoadImageAsDataUrl(url: string): Promise<string | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
            return;
          }
          reject(new Error("Unexpected template read result"));
        };
        reader.onerror = () => reject(new Error("Failed to read template"));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}
