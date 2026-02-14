import { Component, ChangeDetectionStrategy, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Remover import do I18nPipe se não existir ou corrigir caminho
// Remover import não utilizado
import { ExtraServicesService } from '../../services/extra-services.service';
import { AuthService } from '../../../services/auth.service';
import { I18nPipe } from '../../../pipes/i18n.pipe';
import { DataService } from '../../../services/data.service';
import { ExtraService, User } from '../../../models/maintenance.models';

type ExtraServiceView = ExtraService & {
  professional?: User;
  requestTitle: string;
  requestEndDate: string | null;
};

@Component({
  selector: 'app-extra-services',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './extra-services.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraServicesPage implements OnInit {
  private readonly extraServicesService = inject(ExtraServicesService);
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);

  currentUser = this.authService.appUser;
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  extraServices = this.extraServicesService.extraServices;

  showFilters = signal(true);
  filterService = signal<string>('');
  filterExtraService = signal<string>('');
  filterProfessional = signal<number | ''>('');
  filterStatus = signal<string>('');
  filterPerformedDate = signal<string>('');

  sortBy = signal<string>('performedDate');
  sortOrder = signal<'asc' | 'desc'>('desc');

  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  readonly extraServicesView = computed((): ExtraServiceView[] => {
    const users = this.dataService.users();
    const requests = this.dataService.serviceRequests();
    const usersById = new Map(users.map((u) => [u.id, u]));
    const requestsById = new Map(requests.map((r) => [r.id, r]));
    return this.extraServices().map((service) => ({
      ...service,
      professional: usersById.get(service.professional_id),
      requestTitle: requestsById.get(service.service_request_id)?.title ?? "-",
      requestEndDate:
        requestsById.get(service.service_request_id)?.actual_start_datetime ??
        requestsById.get(service.service_request_id)?.work_started_at ??
        requestsById.get(service.service_request_id)?.started_at ??
        null,
    }));
  });

  readonly serviceOptions = computed(() => {
    const unique = new Set<string>();
    this.extraServicesView().forEach((service) => {
      if (service.requestTitle?.trim()) {
        unique.add(service.requestTitle.trim());
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly extraServiceOptions = computed(() => {
    const unique = new Set<string>();
    this.extraServicesView().forEach((service) => {
      if (service.description?.trim()) {
        unique.add(service.description.trim());
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly professionalOptions = computed(() => {
    const professionalIds = new Set<number>();
    this.extraServicesView().forEach((service) => {
      if (service.professional_id) {
        professionalIds.add(service.professional_id);
      }
    });
    return this.dataService
      .users()
      .filter((user) => professionalIds.has(user.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly filteredExtraServicesView = computed((): ExtraServiceView[] => {
    const serviceFilter = this.filterService();
    const extraServiceFilter = this.filterExtraService();
    const professionalFilter = this.filterProfessional();
    const statusFilter = this.filterStatus();
    const performedDateFilter = this.filterPerformedDate();

    let services = this.extraServicesView();

    if (serviceFilter) {
      services = services.filter((service) => service.requestTitle?.trim() === serviceFilter);
    }

    if (extraServiceFilter) {
      services = services.filter((service) => service.description?.trim() === extraServiceFilter);
    }

    if (professionalFilter) {
      services = services.filter((service) => service.professional_id === professionalFilter);
    }

    if (statusFilter) {
      services = services.filter((service) => {
        if (!service.professional?.is_natan_employee) return false;
        if (statusFilter === 'done') return service.has_reimbursement === true;
        if (statusFilter === 'pending') return service.has_reimbursement === false;
        return true;
      });
    }

    if (performedDateFilter) {
      const selected = new Date(performedDateFilter);
      selected.setHours(0, 0, 0, 0);
      const selectedTime = selected.getTime();
      services = services.filter((service) => {
        if (!service.requestEndDate) return false;
        const parsed = new Date(service.requestEndDate);
        if (Number.isNaN(parsed.getTime())) return false;
        parsed.setHours(0, 0, 0, 0);
        return parsed.getTime() === selectedTime;
      });
    }

    return services;
  });

  private compareText(aRaw: string | null | undefined, bRaw: string | null | undefined): number {
    return (aRaw ?? '').localeCompare(bRaw ?? '', 'pt-PT', { sensitivity: 'base' });
  }

  private compareNullableNumber(aValue: number | null | undefined, bValue: number | null | undefined): number {
    let aNum: number | null = null;
    let bNum: number | null = null;
    if (typeof aValue === 'number' && Number.isFinite(aValue)) {
      aNum = aValue;
    }
    if (typeof bValue === 'number' && Number.isFinite(bValue)) {
      bNum = bValue;
    }
    if (aNum === null && bNum === null) return 0;
    if (aNum === null) return 1;
    if (bNum === null) return -1;
    return aNum - bNum;
  }

  private getServiceDateValue(service: ExtraServiceView): number | null {
    if (!service.requestEndDate) return null;
    const parsed = new Date(service.requestEndDate);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : time;
  }

  private getReimbursementStatusRank(service: ExtraServiceView): number {
    if (!service.professional?.is_natan_employee) return -1;
    if (service.has_reimbursement) {
      return 1;
    }
    return 0;
  }

  private compareService(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.compareText(a.requestTitle, b.requestTitle);
  }

  private compareExtraService(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.compareText(a.description, b.description);
  }

  private compareProfessional(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.compareText(a.professional?.name, b.professional?.name);
  }

  private compareStatus(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.getReimbursementStatusRank(a) - this.getReimbursementStatusRank(b);
  }

  private compareValue(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.compareNullableNumber(a.value, b.value);
  }

  private compareReimbursementValue(a: ExtraServiceView, b: ExtraServiceView): number {
    return this.compareNullableNumber(a.reimbursement_value, b.reimbursement_value);
  }

  private comparePerformedDate(a: ExtraServiceView, b: ExtraServiceView): number {
    const aTime = this.getServiceDateValue(a);
    const bTime = this.getServiceDateValue(b);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  }

  readonly sortedExtraServicesView = computed((): ExtraServiceView[] => {
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    const comparators: Record<string, (a: ExtraServiceView, b: ExtraServiceView) => number> = {
      service: (a, b) => this.compareService(a, b),
      extraService: (a, b) => this.compareExtraService(a, b),
      professional: (a, b) => this.compareProfessional(a, b),
      status: (a, b) => this.compareStatus(a, b),
      value: (a, b) => this.compareValue(a, b),
      reimbursementValue: (a, b) => this.compareReimbursementValue(a, b),
      performedDate: (a, b) => this.comparePerformedDate(a, b),
    };

    const compare = comparators[sortBy] ?? (() => 0);
    return [...this.filteredExtraServicesView()].sort((a, b) => compare(a, b) * multiplier);
  });

  readonly paginatedExtraServicesView = computed((): ExtraServiceView[] => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.sortedExtraServicesView().slice(start, end);
  });

  totalPages = computed(() =>
    Math.ceil(this.sortedExtraServicesView().length / this.itemsPerPage())
  );

  readonly hasActiveFilters = computed(() => {
    return (
      !!this.filterService() ||
      !!this.filterExtraService() ||
      !!this.filterProfessional() ||
      !!this.filterStatus() ||
      !!this.filterPerformedDate()
    );
  });

  Math = Math;
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    pages.push(1);
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) if (i !== 1 && i !== total) pages.push(i);
    if (end < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  }

  ngOnInit(): void {
    this.extraServicesService.loadExtraServices();
    if (this.dataService.users().length === 0) {
      this.dataService.fetchUsers();
    }
  }
  // Métodos para adicionar/remover serviços extras podem ser implementados aqui

  selectedReimbursementService = signal<ExtraServiceView | null>(null);
  showReimbursementConfirmModal = signal(false);

  openReimbursementConfirmModal(service: ExtraServiceView): void {
    if (!this.canConfirmReimbursement(service)) return;
    this.selectedReimbursementService.set(service);
    this.showReimbursementConfirmModal.set(true);
  }

  closeReimbursementConfirmModal(): void {
    this.showReimbursementConfirmModal.set(false);
    this.selectedReimbursementService.set(null);
  }

  toggleFilters(): void {
    this.showFilters.update((current) => !current);
  }

  sortByColumn(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortBy.set(column);
    this.sortOrder.set('asc');
  }

  clearFilters(): void {
    this.filterService.set('');
    this.filterExtraService.set('');
    this.filterProfessional.set('');
    this.filterStatus.set('');
    this.filterPerformedDate.set('');
    this.currentPage.set(1);
  }

  previousPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  goToPage(page: number) {
    if (page !== -1) this.currentPage.set(page);
  }

  setItemsPerPage(items: number) {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

  canConfirmReimbursement(service: ExtraServiceView): boolean {
    return service.professional?.is_natan_employee === true && !service.has_reimbursement;
  }

  async confirmReimbursement(): Promise<void> {
    const service = this.selectedReimbursementService();
    if (!service || !this.canConfirmReimbursement(service)) {
      this.closeReimbursementConfirmModal();
      return;
    }
    await this.extraServicesService.confirmReimbursement(service.id);
    this.closeReimbursementConfirmModal();
  }

  // Gerar relatório PDF usando os filtros atuais
  async generateReport(): Promise<void> {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();

    const autoTable: any =
      (autoTableModule as any).default ?? (autoTableModule as any).autoTable;

    // Configurações da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Função auxiliar para adicionar texto com quebra de linha
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.text(text, x, y, options);
      return y + 7; // Altura aproximada da linha
    };

    // Header - Logotipo
    try {
      // Tentar carregar o logotipo como base64
      const response = await fetch('assets/logo-new.png');
      const blob = await response.blob();
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const logoData = reader.result as string;
      doc.addImage(logoData, 'PNG', margin, yPosition, 50, 20);
      yPosition += 25;
    } catch (error) {
      console.warn('Erro ao carregar logotipo:', error);
      yPosition += 10;
    }

    // Título do relatório
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Relatório de Serviços Extras Realizados', pageWidth / 2, yPosition, { align: 'center' });

    // Nome do usuário
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition = addText(`Emitido por: ${this.currentUser()?.name || 'Usuário'}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Filtros aplicados
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Filtros Aplicados:', margin, yPosition);

    doc.setFont('helvetica', 'normal');
    if (this.filterService()) {
      yPosition = addText(`Serviço: ${this.filterService()}`, margin + 10, yPosition);
    }
    if (this.filterExtraService()) {
      yPosition = addText(`Serviço Extra: ${this.filterExtraService()}`, margin + 10, yPosition);
    }
    if (this.filterProfessional()) {
      const professional = this.professionalOptions().find(p => p.id === this.filterProfessional());
      yPosition = addText(`Profissional: ${professional?.name || 'N/A'}`, margin + 10, yPosition);
    }
    if (this.filterStatus()) {
      const statusText = this.filterStatus() === 'done' ? 'Realizado' : this.filterStatus() === 'pending' ? 'Pendente' : 'Todos';
      yPosition = addText(`Status: ${statusText}`, margin + 10, yPosition);
    }
    if (this.filterPerformedDate()) {
      yPosition = addText(`Data Realizada: ${this.formatDate(this.filterPerformedDate())}`, margin + 10, yPosition);
    }

    yPosition += 10;

    // Dados filtrados
    const filteredData = this.filteredExtraServicesView();

    // Tabela de dados
    const tableData = filteredData.map(service => {
      const professional = this.professionalOptions().find(p => p.id === service.professional_id);
      const status = service.has_reimbursement ? 'Realizado' : 'Pendente';
      const realizedDate = service.requestEndDate ? this.formatDate(service.requestEndDate) : '';

      return [
        service.requestTitle,
        service.description,
        professional?.name || 'N/A',
        `€${service.value.toFixed(2)}`,
        service.reimbursement_value ? `€${service.reimbursement_value.toFixed(2)}` : '€0.00',
        status,
        realizedDate
      ];
    });

    // Calcular totais
    const totalValue = filteredData.reduce((sum, s) => sum + s.value, 0);
    const totalReimbursement = filteredData.reduce((sum, s) => sum + (s.reimbursement_value || 0), 0);

    // Adicionar linha de totais
    if (tableData.length > 0) {
      tableData.push([
        'TOTAL',
        '',
        '',
        `€${totalValue.toFixed(2)}`,
        `€${totalReimbursement.toFixed(2)}`,
        '',
        ''
      ]);
    }

    // Configurar autoTable
    autoTable(doc, {
      startY: yPosition,
      head: [['Serviço', 'Serviço Extra', 'Profissional', 'Valor', 'Reembolso', 'Status', 'Realizado']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185], // Cor azul
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10 },
      didDrawPage: (data: any) => {
        // Rodapé
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, margin, pageHeight - 10);
      }
    });

    // Salvar o PDF
    const fileName = `relatorio-servicos-extras-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }
}
