import { Injectable, inject } from "@angular/core";
import { NotificationService } from "./notification.service";
import type { ServiceRequest } from "../models/maintenance.models";
// PDF.js será importado dinamicamente para evitar erro de tipos TS2307

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
  serviceType: string[];
  typology: string;
  brand: string;
  model: string;
  serialNumber: string;
  productCode: string;
  reportedFailure: string;
  clientComments: string;
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

  origin?: TechnicalReportOriginKey;
  signatureBoxY?: number;
}

@Injectable({ providedIn: "root" })
export class TechnicalReportPdfService {
  private notificationService = inject(NotificationService);

  async generateAndDownload(
    request: ServiceRequest,
    payload: TechnicalReportData,
    options?: TechnicalReportPdfOptions
  ): Promise<void> {
    try {
      const { doc, fileName } = await this.generateDocument(request, payload, options);
      doc.save(fileName);
    } catch (err: any) {
      // Log detalhado do erro
      console.error('[PDF ERROR] Erro ao gerar relatório técnico:', err);
      this.notificationService.showError(
        err?.stack || err?.message || JSON.stringify(err) || "Erro ao gerar o relatório técnico."
      );
    }
  }


async generatePdfBlob(
  request: ServiceRequest,
  payload: TechnicalReportData,
  options?: TechnicalReportPdfOptions
): Promise<{ blob: Blob; fileName: string; issuedAt: Date } | undefined> {
  try {
    const result = await this.generateDocument(request, payload, options);
    
    // Verifica se o resultado existe antes de desestruturar
    if (!result || !result.doc) {
      throw new Error('O documento não foi gerado corretamente.');
    }

    const { doc, fileName, issuedAt } = result;
    
    if (typeof doc.output !== 'function') {
      throw new Error('Objeto jsPDF inválido.');
    }

    const blob: Blob = doc.output("blob");
    return { blob, fileName, issuedAt };
  } catch (err: any) {
    console.error('[PDF ERROR]:', err);
    this.notificationService.showError("Falha ao processar dados do PDF: " + err.message);
    return undefined;
  }
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

    // const autoTable: any =
    //   (autoTableModule as any).default ?? (autoTableModule as any).autoTable;

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const originLabel = this.getOriginLabel(payload.origin);
    const issuedAt = new Date();

    // Try to use a background PDF template if it exists, exceto para radio_popular.
    // Place template PDFs in: src/assets/technical-report-templates/
    // Expected filenames:
    // - worten-formulario.pdf (Worten Resolve - Verde)
    // - worten-azul-formulario.pdf (Worten Resolve - Azul)
    // - radio-popular-formulario.pdf

    // if (payload.origin !== "radio_popular" && payload.origin !== "worten_verde" && payload.origin !== "worten_azul") {
    //   try {
    //     await this.tryAddTemplateBackground(doc, payload.origin);
    //   } catch (e) {
    //     console.warn("[PDF WARNING] Falha ao carregar template, continuando sem fundo:", e);
    //   }
    // }

    // Brand header (specific requirements per origin)
    const header = await this.resolveHeaderImage(doc, payload.origin);
    if (header) this.drawHeaderImage(doc, header);
    const headerBaseY = header ? header.heightMm + 6 : 16;

    // Fallback/simple layout (also overlays on top of template backgrounds)
    // const pageHeight = doc.internal.pageSize.getHeight();
    let y = Math.max(40, headerBaseY + 0);

    // Permite customizar tamanho da fonte para campos específicos
    const writeLabelValue = (label: string, value: string, fontSize?: number) => {
      y += 6;
      if (fontSize) doc.setFontSize(fontSize);
      doc.setFont(undefined, "bold");
      doc.text(label, 12, y);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(value || "—", 180);
      doc.text(lines, 55, y);
      y += Math.max(6, lines.length * 5);
      if (fontSize) doc.setFontSize(8); // volta ao padrão
    };

    const writeSectionTitle = (title: string) => {
      y += 2;
      doc.setFont(undefined, "bold");
      doc.text(title, 12, y);
      doc.setFont(undefined, "normal");
      y += 6;
    };

    const writeTextArea = (label: string, value: string, heightMm: number) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const left = 12;
      const width = pageWidth - 24;

      doc.setFont(undefined, "bold");
      doc.text(label, left, y);
      doc.setFont(undefined, "normal");

      y += 4;
      doc.setDrawColor(120);
      doc.rect(left, y, width, heightMm);

      const padding = 2;
      const lines = doc.splitTextToSize(value || "—", width - padding * 2);
      doc.text(lines, left + padding, y + 4);

      y += heightMm + 6;
    };

    if (payload.origin === "worten_verde") {
      // DEBUG: Logar objeto ServiceRequest para depuração de endereço
      console.log('[PDF] ServiceRequest recebido:', JSON.stringify(request, null, 2));
      const d = payload.data;
      // --- DADOS CLIENTE ---
      y = headerBaseY + 2;
      doc.setFontSize(13);
      doc.setTextColor(0, 128, 0); // Verde
      doc.text("Dados Cliente", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      y += 6;
      const dadosClienteLeft = 12;
      const dadosClienteTop = y;
      const dadosClienteWidth = doc.internal.pageSize.getWidth() - 24;
      const dadosClienteLineHeight = 7;
      let dadosClienteY = dadosClienteTop + 8;

      // Primeira linha: Processo, Nome, Data
      doc.setFont(undefined, "bold");
      doc.text("Processo:", dadosClienteLeft + 3, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(d.process || "—", dadosClienteLeft + 25, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Nome:", dadosClienteLeft + 60, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(request.client_name || "—", dadosClienteLeft + 75, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Data:", dadosClienteLeft + 120, dadosClienteY);
      doc.setFont(undefined, "normal");
      const dataAtual = (options?.clientSignedAt || options?.professionalSignedAt || new Date());
      doc.text(
        dataAtual instanceof Date ?
          dataAtual.toLocaleDateString("pt-PT") :
          (typeof dataAtual === "string" ? dataAtual : "—"),
        dadosClienteLeft + 135, dadosClienteY
      );
      dadosClienteY += dadosClienteLineHeight;

      // Segunda linha: Técnico, Empresa, Hora
      doc.setFont(undefined, "bold");
      doc.text("Técnico:", dadosClienteLeft + 3, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(options?.professionalName || "—", dadosClienteLeft + 25, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Empresa:", dadosClienteLeft + 60, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(request.origin?.name || "—", dadosClienteLeft + 75, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Hora:", dadosClienteLeft + 120, dadosClienteY);
      doc.setFont(undefined, "normal");
      const horaAtual = (options?.clientSignedAt || options?.professionalSignedAt || new Date());
      doc.text(
        horaAtual instanceof Date ?
          horaAtual.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) :
          (typeof horaAtual === "string" ? horaAtual : "—"),
        dadosClienteLeft + 135, dadosClienteY
      );
      dadosClienteY += dadosClienteLineHeight;

      // Terceira linha: Morada (logradouro, número, complemento), Código Postal, Localidade
      doc.setFont(undefined, "bold");
      doc.text("Morada:", dadosClienteLeft + 3, dadosClienteY);
      doc.setFont(undefined, "normal");
      // Priorizar endereço estruturado se existir (verificação defensiva para compatibilidade)
      let morada = "—";
      let postalCode = "—";
      let locality = "—";
      // Montar endereço a partir dos campos separados, se não houver address nem client_address
      // @ts-ignore: address pode não existir em todos os ServiceRequest
      const hasStructuredAddress = typeof (request as any).address === 'object' && (request as any).address !== null;
      if (hasStructuredAddress) {
        const addr = (request as any).address;
        // Se não houver logradouro do código postal, mas houver street_manual, priorizar este
        if ((!addr.street || !String(addr.street).trim()) && request.street_manual && String(request.street_manual).trim()) {
          morada = String(request.street_manual).trim();
          if (addr.street_number) morada += ", " + addr.street_number;
          if (addr.complement) morada += " " + addr.complement;
          morada = morada.trim() || "—";
        } else {
          morada = addr.street || "";
          if (addr.street_number) morada += ", " + addr.street_number;
          if (addr.complement) morada += " " + addr.complement;
          morada = morada.trim() || "—";
        }
        postalCode = addr.zip_code || "—";
        locality = addr.city || "—";
      } else if (request.client_address) {
        // ...lógica existente...
        let clientAddr = request.client_address || "";
        const matchPostal = clientAddr.match(/(\d{4}-\d{3})/); 

        if (matchPostal) postalCode = matchPostal[1];
        if (matchPostal) {
          const idxPostal = request.client_address.indexOf(postalCode);
          if (idxPostal > 0) {
            morada = request.client_address.substring(0, idxPostal).replace(/[, -\s]+$/, "").trim();
          } else {
            morada = request.client_address.trim();
          }
        } else {
          if (request.client_address.includes(",")) {
            const parts = request.client_address.split(",");
            morada = parts.slice(0, -1).join(",").trim();
          } else {
            morada = request.client_address.trim();
          }
        }
        let afterPostal = "";
        if (matchPostal) {
          afterPostal = request.client_address.substring(request.client_address.indexOf(postalCode) + postalCode.length).trim();
        }
        if (afterPostal) {
          locality = afterPostal.replace(/^,?\s*/, "");
        } else if (request.client_address.includes(",")) {
          const parts = request.client_address.split(",");
          if (parts.length > 1) locality = parts[parts.length - 1].trim();
        }
        if (!locality || locality === "—") {
          const words = request.client_address.trim().split(" ");
          if (words.length > 0) locality = words[words.length - 1];
        }
      } else if (request.street || request.zip_code || request.city) {
        // Monta morada a partir dos campos separados
        morada = request.street || "";
        if (request.street_number) morada += ", " + request.street_number;
        if (request.complement) morada += " " + request.complement;
        morada = morada.trim() || "—";
        postalCode = request.zip_code || "—";
        locality = request.city || "—";
      }
      doc.text(morada || "—", dadosClienteLeft + 25, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Código Postal:", dadosClienteLeft + 90, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(postalCode || "—", dadosClienteLeft + 115, dadosClienteY);
      doc.setFont(undefined, "bold");
      doc.text("Localidade:", dadosClienteLeft + 140, dadosClienteY);
      doc.setFont(undefined, "normal");
      doc.text(locality || "—", dadosClienteLeft + 160, dadosClienteY);
      dadosClienteY += dadosClienteLineHeight;

      // Quarta linha: Tipo de Serviço (checkboxes)
      doc.setFont(undefined, "bold");
      doc.text("Tipo de Serviço:", dadosClienteLeft + 3, dadosClienteY);
      doc.setFont(undefined, "normal");
      // Reparação não tem checkbox, os demais sim
      const tiposServico = [
        { key: "Instalação", label: "Instalação", checkbox: true },
        { key: "Reparação", label: "Reparação:", checkbox: false },
        { key: "Garantia", label: "Garantia", checkbox: true },
        { key: "Extensão de Garantia", label: "Extensão de Garantia", checkbox: true },
        { key: "Orçamento", label: "Orçamento", checkbox: true },
        { key: "SAT24", label: "SAT24", checkbox: true },
      ];
      let xCheckbox = dadosClienteLeft + 30;
      const boxSize = 4;
      const gap = 6;
      tiposServico.forEach((tipo, idx) => {
        doc.setFont(undefined, "bold");
        doc.text(tipo.label, xCheckbox, dadosClienteY);
        if (tipo.checkbox) {
          const boxX = xCheckbox + doc.getTextWidth(tipo.label) + 2;
          doc.setDrawColor(0, 128, 0); // Verde
          doc.setFont(undefined, "bold");
          doc.rect(boxX, dadosClienteY - boxSize + 2, boxSize, boxSize);
          if (d.serviceType && d.serviceType.includes(tipo.key)) {
            doc.setLineWidth(0.7);
            doc.line(boxX, dadosClienteY - boxSize + 2, boxX + boxSize, dadosClienteY + 2);
            doc.line(boxX + boxSize, dadosClienteY - boxSize + 2, boxX, dadosClienteY + 2);
          }
          xCheckbox = boxX + boxSize + gap;
        } else {
          xCheckbox = xCheckbox + doc.getTextWidth(tipo.label) + gap + 2;
        }
      });
      doc.setFont(undefined, "normal");
      dadosClienteY += dadosClienteLineHeight;

      // Moldura dos dados do cliente
      const dadosClienteBoxHeight = dadosClienteY - dadosClienteTop + 4;
      doc.setDrawColor(0, 128, 0);
      doc.setLineWidth(0.7);
      doc.rect(dadosClienteLeft, dadosClienteTop, dadosClienteWidth, dadosClienteBoxHeight, 'S');
      y = dadosClienteTop + dadosClienteBoxHeight + 8; // Espaço maior acima do título

      // --- INTERVENÇÃO ---
      doc.setFontSize(13);
      doc.setTextColor(0, 128, 0);
      doc.text("Intervenção", 12, y);
      y += 2; // Espaço menor abaixo do título
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      y += 6;
      const intervencaoTop = y;
      const intervencaoLeft = 12;
      const intervencaoWidth = doc.internal.pageSize.getWidth() - 24;
      const intervencaoLineHeight = 7;
      let intervencaoY = intervencaoTop + 8;
      let obsWidth = 120;
      let obsText = d.technicalNotes || "—";
      let obsLines = doc.splitTextToSize(obsText, obsWidth);
      let obsHeight = obsLines.length * intervencaoLineHeight;
      // Linha 1: Tipologia | Marca
      doc.setFont(undefined, "bold");
      doc.text("Tipologia:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.typology || "—", intervencaoLeft + 30, intervencaoY);
      doc.setFont(undefined, "bold");
      doc.text("Marca:", intervencaoLeft + 90, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.brand || "—", intervencaoLeft + 115, intervencaoY);
      intervencaoY += intervencaoLineHeight;
      // Linha 2: Modelo | Nº de Série
      doc.setFont(undefined, "bold");
      doc.text("Modelo:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.model || "—", intervencaoLeft + 30, intervencaoY);
      doc.setFont(undefined, "bold");
      doc.text("Nº de Série:", intervencaoLeft + 90, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.serialNumber || "—", intervencaoLeft + 115, intervencaoY);
      intervencaoY += intervencaoLineHeight;
      // Linha 3: Código do Produto | Avaria Reportada
      doc.setFont(undefined, "bold");
      doc.text("Código do Produto:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.productCode || "—", intervencaoLeft + 45, intervencaoY);
      doc.setFont(undefined, "bold");
      doc.text("Avaria Reportada:", intervencaoLeft + 90, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(d.reportedFailure || "—", intervencaoLeft + 125, intervencaoY);
      intervencaoY += intervencaoLineHeight;
      // Linha 4: Artigo antigo recolhido
      doc.setFont(undefined, "bold");
      doc.text("Artigo antigo recolhido:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text("Sim", intervencaoLeft + 60, intervencaoY);
      doc.setDrawColor(0, 128, 0); // Verde
      doc.rect(intervencaoLeft + 70, intervencaoY - 4, 4, 4);
      if (d.oldItemCollected) {
        doc.setLineWidth(0.7);
        doc.line(intervencaoLeft + 70, intervencaoY - 4, intervencaoLeft + 74, intervencaoY);
        doc.line(intervencaoLeft + 74, intervencaoY - 4, intervencaoLeft + 70, intervencaoY);
      }
      doc.text("Não", intervencaoLeft + 80, intervencaoY);
      doc.setDrawColor(0, 128, 0); // Verde
      doc.rect(intervencaoLeft + 90, intervencaoY - 4, 4, 4);
      if (!d.oldItemCollected) {
        doc.setLineWidth(0.7);
        doc.line(intervencaoLeft + 90, intervencaoY - 4, intervencaoLeft + 94, intervencaoY);
        doc.line(intervencaoLeft + 94, intervencaoY - 4, intervencaoLeft + 90, intervencaoY);
      }
      doc.setFont(undefined, "normal");
      intervencaoY += intervencaoLineHeight;
      // Linha 5: Artigo levantado oficina
      doc.setFont(undefined, "bold");
      doc.text("Artigo levantado oficina:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text("Sim", intervencaoLeft + 60, intervencaoY);
      doc.setDrawColor(0, 128, 0); // Verde
      doc.rect(intervencaoLeft + 70, intervencaoY - 4, 4, 4);
      if (d.itemPickedUpAtWorkshop) {
        doc.setLineWidth(0.7);
        doc.line(intervencaoLeft + 70, intervencaoY - 4, intervencaoLeft + 74, intervencaoY);
        doc.line(intervencaoLeft + 74, intervencaoY - 4, intervencaoLeft + 70, intervencaoY);
      }
      doc.text("Não", intervencaoLeft + 80, intervencaoY);
      doc.setDrawColor(0, 128, 0); // Verde
      doc.rect(intervencaoLeft + 90, intervencaoY - 4, 4, 4);
      if (!d.itemPickedUpAtWorkshop) {
        doc.setLineWidth(0.7);
        doc.line(intervencaoLeft + 90, intervencaoY - 4, intervencaoLeft + 94, intervencaoY);
        doc.line(intervencaoLeft + 94, intervencaoY - 4, intervencaoLeft + 90, intervencaoY);
      }
      doc.setFont(undefined, "normal");
      intervencaoY += intervencaoLineHeight;
      // Linha 6: Observações Técnicas
      doc.setFont(undefined, "bold");
      doc.text("Observações Técnicas:", intervencaoLeft + 3, intervencaoY);
      doc.setFont(undefined, "normal");
      doc.text(obsLines, intervencaoLeft + 50, intervencaoY);
      intervencaoY += obsHeight;
      // Moldura da intervenção
      const intervencaoBoxHeight = intervencaoY - intervencaoTop + 4;
      doc.setDrawColor(0, 128, 0);
      doc.setLineWidth(0.7);
      doc.rect(intervencaoLeft, intervencaoTop, intervencaoWidth, intervencaoBoxHeight, 'S');
      y = intervencaoTop + intervencaoBoxHeight + 4;

      if (d.materials.length > 0) {
          // DEBUG: Verificar materiais antes de renderizar
          console.log('PDF - Materiais recebidos:', d.materials);
      // Bloco Material SEMPRE aparece, mesmo sem materiais
      y += 12;
      // Calcular altura estimada do bloco Materiais
      const materialBoxTop = y + 2;
      const materialBoxLeft = 12;
      const materialBoxWidth = doc.internal.pageSize.getWidth() - 24;
      const materialLineHeight = 7;
      const materialRows = Math.max(1, d.materials.length);
      const materialBoxHeight = (materialRows + 1) * materialLineHeight + 12;
      const materiaisBlockHeight = materialBoxHeight + 18;
      doc.setFontSize(13);
      doc.setTextColor(0, 128, 0);
      doc.text("Material", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setDrawColor(0, 128, 0);
      doc.setLineWidth(0.7);
      doc.rect(materialBoxLeft, materialBoxTop, materialBoxWidth, materialBoxHeight, 'S');
      let materialY = materialBoxTop + 8;
      doc.setFont(undefined, "bold");
      doc.text("Descrição", materialBoxLeft + 3, materialY);
      doc.text("Total c/ IVA", materialBoxLeft + materialBoxWidth - 45, materialY);
      doc.setFont(undefined, "normal");
      materialY += materialLineHeight;
      if (d.materials.length > 0) {
        d.materials.forEach((m) => {
          doc.text(m.description || "—", materialBoxLeft + 3, materialY);
          doc.text(
            m.totalWithVat !== null && m.totalWithVat !== undefined
              ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(m.totalWithVat)
              : "—",
            materialBoxLeft + materialBoxWidth - 45,
            materialY
          );
          materialY += materialLineHeight;
        });
      } else {
        doc.text("—", materialBoxLeft + 3, materialY);
        doc.text("—", materialBoxLeft + materialBoxWidth - 45, materialY);
      }
      y = materialBoxTop + materialBoxHeight;

      // Exibir Comentários/Sugestões do Cliente após a lista de materiais, com quebra de linha
      // Bloco Comentários/Sugestões do Cliente SEMPRE aparece
      y += 12;
      // Título Comentários/Sugestões do Cliente (modelo Intervenção)
      const comentariosBoxTop = y + 2;
      const comentariosBoxLeft = 12;
      const comentariosBoxWidth = doc.internal.pageSize.getWidth() - 24;
      const comentariosLineHeight = 7;
      const commentText = d.clientComments && d.clientComments.trim().length > 0 ? d.clientComments : "—";
      const commentLines = doc.splitTextToSize(commentText, 180);
      // Altura dinâmica do bloco
      const comentariosBoxHeight = Math.max(18, commentLines.length * comentariosLineHeight + 16);
      doc.setFontSize(13);
      doc.setTextColor(0, 128, 0);
      doc.text("Comentários/Sugestões do Cliente", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setDrawColor(0, 128, 0);
      doc.setLineWidth(0.7);
      doc.rect(comentariosBoxLeft, comentariosBoxTop, comentariosBoxWidth, comentariosBoxHeight, 'S');
      let comentariosY = comentariosBoxTop + 8;
      doc.setFont(undefined, "normal");
      doc.text(commentLines, comentariosBoxLeft + 3, comentariosY);
    y = comentariosBoxTop + comentariosBoxHeight + 4;
    }

    // Desenhar assinaturas para worten_verde

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
    const fileName = this.buildFileName(payload.origin, request.id, issuedAt);
    return { doc, fileName, issuedAt };
      // Fim do bloco if (payload.origin === "worten_verde")

    }

    if (payload.origin === "worten_azul") {
      console.log('[PDF] ServiceRequest recebido:', JSON.stringify(request, null, 2));
      const d = payload.data;
      // --- DADOS DO FORNECEDOR ---
      y = headerBaseY + 2;
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text("DADOS DO FORNECEDOR", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      // Adiciona moldura e texto solicitado
      const frameLeft = 12;
      const frameTop = y + 6;
      const frameWidth = doc.internal.pageSize.getWidth() - 24;
      const frameHeight = 12;
      doc.setDrawColor(0, 102, 204); // Azul
      doc.setLineWidth(0.7);
      doc.rect(frameLeft, frameTop, frameWidth, frameHeight, 'S');
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Nome/ Refª da Loja: Worten - Equipamentos para o Lar, S.A.", frameLeft + 3, frameTop + 8);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y = frameTop + frameHeight;
      // Título DADOS DO CLIENTE abaixo da moldura
      y += 12;
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text("DADOS DO CLIENTE", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      // Moldura abaixo do título DADOS DO CLIENTE
      const clientFrameLeft = 12;
      const clientFrameTop = y + 6;
      const clientFrameWidth = doc.internal.pageSize.getWidth() - 24;
      // Ajusta altura da moldura para comportar 5 linhas (Nome/NIF, Endereço/Código Postal, Cidade/Freguesia, Telefone, E-mail)
      const clientFrameHeight = 28;
      doc.setDrawColor(0, 102, 204); // Azul
      doc.setLineWidth(0.7);
      doc.rect(clientFrameLeft, clientFrameTop, clientFrameWidth, clientFrameHeight, 'S');
      doc.setFontSize(9);
      // Primeira linha: Nome e Apelido | NIF
      doc.setFont(undefined, "bold");
      doc.text("Nome e Apelido:", clientFrameLeft + 3, clientFrameTop + 5);
      doc.setFont(undefined, "normal");
      doc.text((request.client_name || "—").toString(), clientFrameLeft + 35, clientFrameTop + 5);
      doc.setFont(undefined, "bold");
      doc.text("NIF:", clientFrameLeft + clientFrameWidth - 45, clientFrameTop + 5);
      doc.setFont(undefined, "normal");
      doc.text((request.client_nif || "—").toString(), clientFrameLeft + clientFrameWidth - 25, clientFrameTop + 5);


      // Segunda linha: Endereço do Serviço (esquerda) | Código Postal (direita)
      const addressY = clientFrameTop + 10;
      doc.setFont(undefined, "bold");
      doc.text("Endereço do Serviço:", clientFrameLeft + 3, addressY);
      doc.setFont(undefined, "normal");
      let enderecoServico = "—";
      if (request.street || request.street_number || request.complement) {
        enderecoServico = (request.street || "");
        if (request.street_number) enderecoServico += ", " + request.street_number;
        if (request.complement) enderecoServico += " " + request.complement;
        enderecoServico = enderecoServico.trim() || "—";
      }
      doc.text(enderecoServico, clientFrameLeft + 45, addressY);
      doc.setFont(undefined, "bold");
      doc.text("Código Postal:", clientFrameLeft + clientFrameWidth - 45, addressY);
      doc.setFont(undefined, "normal");
      doc.text((request.zip_code || "—").toString(), clientFrameLeft + clientFrameWidth - 25, addressY);

      // Terceira linha: Cidade (distrito) e Freguesia (localidade)
      const cityY = clientFrameTop + 17;
      doc.setFont(undefined, "bold");
      doc.text("Cidade:", clientFrameLeft + 3, cityY);
      doc.setFont(undefined, "normal");
      doc.text((request.state || "—").toString(), clientFrameLeft + 25, cityY);
      doc.setFont(undefined, "bold");
      doc.text("Freguesia:", clientFrameLeft + clientFrameWidth - 45, cityY);
      doc.setFont(undefined, "normal");
      doc.text((request.city || "—").toString(), clientFrameLeft + clientFrameWidth - 25, cityY);

      // Quarta linha: Telefone (esquerda) | E-mail (direita)
      const contactY = clientFrameTop + 24;
      doc.setFont(undefined, "bold");
      doc.text("Telefone:", clientFrameLeft + 3, contactY);
      doc.setFont(undefined, "normal");
      doc.text((request.client_phone || "—").toString(), clientFrameLeft + 25, contactY);
      doc.setFont(undefined, "bold");
      doc.text("E-mail:", clientFrameLeft + clientFrameWidth - 45, contactY);
      doc.setFont(undefined, "normal");
      doc.text((request.email_client || "—").toString(), clientFrameLeft + clientFrameWidth - 25, contactY);

      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y = clientFrameTop + clientFrameHeight;

      // Título DADOS DO SERVIÇO abaixo da moldura
      y += 12;
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text("DADOS DO SERVIÇO", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      // Moldura DADOS DO SERVIÇO
      const serviceFrameLeft = 12;
      const serviceFrameTop = y + 6;
      const serviceFrameWidth = doc.internal.pageSize.getWidth() - 24;
      // Altura suficiente para uma linha
      const serviceFrameHeight = 8;
      doc.setDrawColor(0, 102, 204); // Azul
      doc.setLineWidth(0.7);
      doc.rect(serviceFrameLeft, serviceFrameTop, serviceFrameWidth, serviceFrameHeight, 'S');
      doc.setFontSize(9);
      // Primeira linha: Número da fatura | Número do Serviço
      doc.setFont(undefined, "bold");
      doc.text("Número da fatura:", serviceFrameLeft + 3, serviceFrameTop + 5);
      doc.setFont(undefined, "normal");
      doc.text((d.invoiceNumber || "—").toString(), serviceFrameLeft + 40, serviceFrameTop + 5);
      doc.setFont(undefined, "bold");
      doc.text("Número do Serviço:", serviceFrameLeft + serviceFrameWidth - 60, serviceFrameTop + 5);
      doc.setFont(undefined, "normal");
      doc.text((d.serviceNumber || "—").toString(), serviceFrameLeft + serviceFrameWidth - 25, serviceFrameTop + 5);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y = serviceFrameTop + serviceFrameHeight;

      // Título DADOS DO INSTALADOR abaixo da moldura
      y += 12;
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text("DADOS DO INSTALADOR", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      // Moldura DADOS DO INSTALADOR (modelo igual à de DADOS DO SERVIÇO, mas com 2 linhas)
      const installerFrameLeft = 12;
      const installerFrameTop = y + 6;
      const installerFrameWidth = doc.internal.pageSize.getWidth() - 24;
      const installerFrameHeight = 14; // 2 linhas
      doc.setDrawColor(0, 102, 204); // Azul
      doc.setLineWidth(0.7);
      doc.rect(installerFrameLeft, installerFrameTop, installerFrameWidth, installerFrameHeight, 'S');
      doc.setFontSize(9);
      // Primeira linha: Nome/designação social da empresa
      doc.setFont(undefined, "bold");
      doc.text("Nome e/ou designação social da empresa:", installerFrameLeft + 3, installerFrameTop + 5);
      doc.setFont(undefined, "normal");
      doc.text("Worten - Equipamentos para o Lar S.A", installerFrameLeft + 80, installerFrameTop + 5);
      // Segunda linha: NIF/NIPC
      doc.setFont(undefined, "bold");
      doc.text("NIF/NIPC:", installerFrameLeft + 3, installerFrameTop + 11);
      doc.setFont(undefined, "normal");
      doc.text("503630330", installerFrameLeft + 30, installerFrameTop + 11);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y = installerFrameTop + installerFrameHeight;

      // Título RELATÓRIO TÉCNICO/OBSERVAÇÕES abaixo da última moldura
      y += 12;
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text("RELATÓRIO TÉCNICO/OBSERVAÇÕES", 12, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      // Moldura para observações (modelo igual à de DADOS DO INSTALADOR, altura dinâmica)
      const obsFrameLeft = 12;
      const obsFrameTop = y + 6;
      const obsFrameWidth = doc.internal.pageSize.getWidth() - 24;
      // Calcular altura dinâmica do bloco de observações
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      const obsText = (d.reportNotes || "—").toString();
      const obsLines = doc.splitTextToSize(obsText, obsFrameWidth - 8);
      const obsLineHeight = 5.5;
      const obsFrameHeight = Math.max(14, obsLines.length * obsLineHeight + 6);
      doc.setDrawColor(0, 102, 204); // Azul
      doc.setLineWidth(0.7);
      doc.rect(obsFrameLeft, obsFrameTop, obsFrameWidth, obsFrameHeight, 'S');
      // Exibir texto justificado dentro da moldura
      let obsY = obsFrameTop + 7;
      obsLines.forEach(line => {
        doc.text(line, obsFrameLeft + 4, obsY, { align: "justify", maxWidth: obsFrameWidth - 8 });
        obsY += obsLineHeight;
      });
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y = obsFrameTop + obsFrameHeight;
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

      // Título DADOS DO CLIENTE com fonte menor (igual ao DADOS DO SERVIÇO)
      y += 2;
      doc.setFontSize(10); // mesmo tamanho do título DADOS DO SERVIÇO
      doc.setFont(undefined, "bold");
      doc.text("DADOS DO CLIENTE", 12, y);
      doc.setFont(undefined, "normal");
      y += 2; // espaço reduzido antes da linha NOME/NOTA SERVIÇO
      const smallFont = 7;
      // Linha 1: NOME e NOTA SERVIÇO
      y += 6;
      doc.setFontSize(smallFont);
      doc.setFont(undefined, "bold");
      doc.text("NOME:", 12, y);
      doc.setFont(undefined, "normal");
      doc.text((request.client_name || "—").toString(), 28, y);
      doc.setFont(undefined, "bold");
      doc.text("NOTA SERVIÇO:", 90, y);
      doc.setFont(undefined, "normal");
      doc.text((d.serviceNote || "—").toString(), 120, y);
      // Linha 2: MORADA
      y += 6;
      doc.setFont(undefined, "bold");
      doc.text("MORADA:", 12, y);
      doc.setFont(undefined, "normal");
      doc.text(addressLine || "—", 32, y);
      // Linha 3: CÓDIGO POSTAL, LOCALIDADE, TEL
      y += 6;
      doc.setFont(undefined, "bold");
      doc.text("CÓDIGO POSTAL:", 12, y);
      doc.setFont(undefined, "normal");
      doc.text((request.zip_code || "—").toString(), 40, y);
      doc.setFont(undefined, "bold");
      doc.text("LOCALIDADE:", 65, y);
      doc.setFont(undefined, "normal");
      doc.text((request.city || "—").toString(), 90, y);
      doc.setFont(undefined, "bold");
      doc.text("TEL:", 130, y);
      doc.setFont(undefined, "normal");
      doc.text((request.client_phone || "—").toString(), 140, y);
      // Linha 4: E-MAIL
      y += 6;
      doc.setFont(undefined, "bold");
      doc.text("EMAIL:", 12, y);
      doc.setFont(undefined, "normal");
      doc.text((request.email_client || "—").toString(), 32, y);
      doc.setFontSize(8); // volta ao padrão
      // Espaço extra para evitar sobreposição com o título seguinte
      y += 10;

      writeSectionTitle("DADOS DO SERVIÇO");
      writeTextArea("Instalação", d.installation, 10);
      writeTextArea("Descrição dos trabalhos", d.workDescription, 26);
      writeTextArea("Serviços Extras Realizados", d.extraServicesInstalled, 18);
    }

    let radioPopularFooter:
      | { rpText: string[]; lineHeight: number; rpTextStartY: number; signatureBoxY: number }
      | null = null;

    if (payload.origin === "radio_popular") {
      const rpText = this.getRadioPopularFooterText();
      const lineHeight = 4;
      const rpBlockHeight = rpText.length * lineHeight;
      const signatureBlockHeight = 32; // 22mm box + 10mm labels
      const gap = 6;
      const marginBottom = 10;
      const pageHeight = doc.internal.pageSize.getHeight();
      const requiredHeight = rpBlockHeight + gap + signatureBlockHeight;

      if (y + requiredHeight > pageHeight - marginBottom) {
        doc.addPage();
        if (header) this.drawHeaderImage(doc, header);
      }

      const rpTextStartY = pageHeight - marginBottom - rpBlockHeight;
      const signatureBoxY = rpTextStartY - gap - 22;
      radioPopularFooter = { rpText, lineHeight, rpTextStartY, signatureBoxY };
    }

    this.addClientSignature(doc, {
      clientSignatureDataUrl: options?.clientSignatureDataUrl,
      clientName: options?.clientName,
      clientSignedAt: options?.clientSignedAt ?? issuedAt,
      origin: payload.origin,
      signatureBoxY: radioPopularFooter?.signatureBoxY,
    });

    this.addProfessionalSignature(doc, {
      professionalSignatureDataUrl: options?.professionalSignatureDataUrl,
      professionalName: options?.professionalName,
      professionalSignedAt: options?.professionalSignedAt ?? issuedAt,
      origin: payload.origin,
      signatureBoxY: radioPopularFooter?.signatureBoxY,
    });

    if (payload.origin === "radio_popular" && radioPopularFooter) {
      const leftMargin = 12;
      let footerY = radioPopularFooter.rpTextStartY;
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      for (const line of radioPopularFooter.rpText) {
        if (line === "") {
          footerY += radioPopularFooter.lineHeight;
        } else {
          doc.text(line, leftMargin, footerY, { align: "left" });
          footerY += radioPopularFooter.lineHeight;
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
    const isRadioPopular = options?.origin === "radio_popular";
    const boxY = options?.signatureBoxY ??
      (isRadioPopular ? pageHeight - 40 - blockHeight - 42 : pageHeight - 40);

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
    const isRadioPopular = options?.origin === "radio_popular";
    const boxY = options?.signatureBoxY ??
      (isRadioPopular ? pageHeight - 40 - blockHeight - 42 : pageHeight - 40);

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

  // private async tryAddTemplateBackground(doc: any, origin: TechnicalReportOriginKey): Promise<void> {
  //   const pdfTemplateFile = this.getTemplatePdfFile(origin);
  //   const pdfUrl = this.resolveAssetUrl(
  //     `assets/technical-report-templates/${pdfTemplateFile}`
  //   );

  //   const pageWidth = doc.internal.pageSize.getWidth();
  //   const pageHeight = doc.internal.pageSize.getHeight();

  //   const pdfAsPngDataUrl = await this.tryRenderPdfFirstPageAsPngDataUrl(pdfUrl);
  //   if (!pdfAsPngDataUrl) {
  //     throw new Error(
  //       "Não foi possível carregar o template do relatório técnico. O arquivo PDF foi encontrado, mas não pôde ser convertido em imagem. Verifique o formato e permissões."
  //     );
  //   }
  //   this.addImageDataUrl(doc, pdfAsPngDataUrl, 0, 0, pageWidth, pageHeight);
  //   return;
  // }

  // private getTemplatePdfFile(origin: TechnicalReportOriginKey): string {
  //   switch (origin) {
  //     case "worten_verde":
  //       return "worten-formulario.pdf";
  //     case "worten_azul":
  //       return "worten-azul-formulario.pdf";
  //     case "radio_popular":
  //       return "radio-popular-formulario.pdf";
  //   }
  // }

  private getRadioPopularFooterText(): string[] {
    return [
      "Serviço de Apoio ao Cliente RP",
      "Telefone: 22 040 30 40 (chamada para a rede fixa nacional)",
      "e-mail: cliente@radiopopular.pt   www.radiopopular.pt",
      "", // linha em branco
      "SERVIÇOS CENTRAIS",
      "Aguda Parque - Largo de Arcozelo, nº 76, Edifício E - 4410-455 Arcozelo, V. N. Gaia",
      "T. 229 409 600 - F. 229 409 601",
      "www.radiopopular.pt",
      "", // linha em branco
      "RADIO POPULAR ELETRODOMÉSTICOS, S.A. | CONTRIBUINTE 500 674 205 | CAPITAL SOCIAL 1.497.000 EUROS | INSC. NA C.R.C. MAIA SOB Nº 500 674 205",
    ];
  }

  private async resolveHeaderImage(
    doc: any,
    origin: TechnicalReportOriginKey
  ): Promise<{ dataUrl: string; heightMm: number } | null> {
    let candidates: string[] | null = null;
    switch (origin) {
      case "worten_verde":
        candidates = [
          "/assets/Header_Worten_Green.png",
          "/src/assets/Header_Worten_Green.png",
          "assets/Header_Worten_Green.png",
          "src/assets/Header_Worten_Green.png",
        ];
        break;
      case "worten_azul":
        candidates = [
          "/assets/Header_Worten_Blue.png",
          "/src/assets/Header_Worten_Blue.png",
          "assets/Header_Worten_Blue.png",
          "src/assets/Header_Worten_Blue.png",
        ];
        break;
      case "radio_popular":
        candidates = [
          "/assets/Header_Radio_Popular_Blue.png",
          "/src/assets/Header_Radio_Popular_Blue.png",
          "assets/Header_Radio_Popular_Blue.png",
          "src/assets/Header_Radio_Popular_Blue.png",
        ];
        break;
      default:
        return null;
    }

    let dataUrl: string | null = null;
    for (const url of candidates) {
      dataUrl = await this.tryLoadImageViaElement(this.resolveAssetUrl(url));
      if (dataUrl) break;
    }
  if (!dataUrl) {
      console.warn(`[PDF] Header não encontrado para ${origin}.`);
      return null;
  }

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
    return { dataUrl, heightMm: Math.min(Math.max(targetHeight, 16), 32) };
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
      console.log('[PDF DEBUG] Iniciando fetch do template PDF:', url);
      const resp = await fetch(url);
      console.log('[PDF DEBUG] Status do fetch:', resp.status, resp.statusText);
      if (!resp.ok) {
        console.error('[PDF DEBUG] Falha ao buscar o PDF:', url, resp.status, resp.statusText);
        return null;
      }

      const arrayBuffer = await resp.arrayBuffer();
      console.log('[PDF DEBUG] ArrayBuffer carregado, tamanho:', arrayBuffer.byteLength);

      // Importa PDF.js dinamicamente para evitar erro de tipos
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      if ((pdfjsLib as any).GlobalWorkerOptions) {
        // Defina workerSrc para um caminho JS válido, mesmo que o worker não seja usado
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.js';
      }
      const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer, disableWorker: true });
      const pdf = await loadingTask.promise;
      console.log('[PDF DEBUG] PDF carregado, número de páginas:', pdf.numPages);

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      console.log('[PDF DEBUG] Página 1 obtida, viewport:', viewport.width, viewport.height);

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error('[PDF DEBUG] Falha ao obter contexto 2D do canvas.');
        return null;
      }

      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      console.log('[PDF DEBUG] Renderização da página concluída.');

      // Cleanup is best-effort.
      try {
        page.cleanup();
      } catch {}
      return canvas.toDataURL("image/png");
    } catch {
      return await this.tryLoadImageViaElement(url);
    }
  }

  private async tryLoadImageViaElement(url: string): Promise<string | null> {
    // Fallback: try loading via Image element (some hosts block fetch for assets)
    if (globalThis.window === undefined || globalThis.document === undefined) return null;
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  private resolveAssetUrl(path: string): string {
    const trimmed = path.replace(/^\/+/, "");
    const baseHref =
      typeof document !== "undefined"
        ? document.querySelector("base")?.href
        : undefined;
    const base =
      baseHref ||
      (typeof window !== "undefined" ? `${window.location.origin}/` : "");
    try {
      return new URL(trimmed, base).toString();
    } catch {
      return path;
    }
  }
}
