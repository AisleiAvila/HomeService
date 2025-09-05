import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { User, ServiceRequest, ServiceCategory, ServiceStatus } from '../../models/maintenance.models';

type AdminView = 'overview' | 'requests' | 'professionals' | 'categories' | 'finances';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  currentView = signal<AdminView>('overview');
  readonly views: { id: AdminView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Visão Geral', icon: 'fas fa-chart-pie' },
    { id: 'requests', label: 'Solicitações', icon: 'fas fa-tasks' },
    { id: 'finances', label: 'Finanças', icon: 'fas fa-file-invoice-dollar' },
    { id: 'professionals', label: 'Profissionais', icon: 'fas fa-users-cog' },
    { id: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
  ];

  allRequests = this.dataService.serviceRequests;
  allUsers = this.dataService.users;
  allCategories = this.dataService.categories;

  professionals = computed(() => this.allUsers().filter(u => u.role === 'professional'));
  
  actionableRequests = computed(() => this.allRequests().filter(r => ['Pending', 'Quoted', 'Approved'].includes(r.status)).sort((a,b) => a.requestedDate.getTime() - b.requestedDate.getTime()));

  stats = computed(() => {
    const requests = this.allRequests();
    const totalEarnings = requests
      .filter(r => r.paymentStatus === 'Paid' && r.cost)
      .reduce((sum, r) => sum + r.cost! * 1.07, 0); // With tax

    return [
      { label: 'Receita Total', value: this.formatCost(totalEarnings), icon: 'fas fa-dollar-sign text-green-500', bgColor: 'bg-green-100' },
      { label: 'Ações Pendentes', value: this.actionableRequests().length, icon: 'fas fa-exclamation-circle text-yellow-500', bgColor: 'bg-yellow-100' },
      { label: 'Serviços Ativos', value: requests.filter(r => r.status === 'In Progress').length, icon: 'fas fa-running text-blue-500', bgColor: 'bg-blue-100' },
      { label: 'Total de Profissionais', value: this.professionals().length, icon: 'fas fa-users text-purple-500', bgColor: 'bg-purple-100' }
    ];
  });
  
  // State for modals
  quoteRequest = signal<ServiceRequest | null>(null);
  quoteAmount = signal<number | null>(null);
  assignmentRequest = signal<ServiceRequest | null>(null);
  assigningProfessionalId = signal<number | null>(null);
  invoiceRequest = signal<ServiceRequest | null>(null);

  // State for category management
  newCategory = signal('');
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal('');
  
  // State for professional management
  showAddProfessionalForm = signal(false);
  newProfessionalName = signal('');
  newProfessionalEmail = signal('');
  newProfessionalSpecialties = signal<ServiceCategory[]>([]);
  editingProfessional = signal<User | null>(null);
  editingProfessionalName = signal('');
  editingProfessionalEmail = signal('');
  editingProfessionalSpecialties = signal<ServiceCategory[]>([]);


  setView(view: AdminView) {
    this.currentView.set(view);
  }

  getClientName(clientId: number): string {
    return this.allUsers().find(u => u.id === clientId)?.name ?? 'Cliente Desconhecido';
  }

  getProfessionalName(proId: number | null): string {
    if (proId === null) return 'Não atribuído';
    return this.allUsers().find(u => u.id === proId)?.name ?? 'Não atribuído';
  }

  getProfessionalsForRequest(category: ServiceCategory): User[] {
    return this.dataService.getProfessionalsByCategory(category);
  }

  // --- Quote & Request Logic ---
  selectRequestForQuote(request: ServiceRequest) {
    this.quoteAmount.set(request.cost);
    this.quoteRequest.set(request);
  }

  submitQuote() {
    const request = this.quoteRequest();
    const amount = this.quoteAmount();
    if (request && amount && amount > 0) {
      this.dataService.submitQuote(request.id, amount);
      this.quoteRequest.set(null);
    }
  }
  
  respondToQuote(requestId: number, approved: boolean) {
      this.dataService.respondToQuote(requestId, approved);
      this.quoteRequest.set(null);
  }

  // --- Assignment Logic ---
  selectRequestForAssignment(request: ServiceRequest) {
      this.assigningProfessionalId.set(null);
      this.assignmentRequest.set(request);
  }
  
  assignProfessional() {
      const request = this.assignmentRequest();
      const proId = this.assigningProfessionalId();
      if (request && proId) {
          this.dataService.assignProfessional(request.id, proId);
          this.assignmentRequest.set(null);
      }
  }
  
  // --- Category Management ---
  addCategory() {
      const name = this.newCategory().trim();
      if (name) {
          this.dataService.addCategory(name);
          this.newCategory.set('');
      }
  }

  startEditCategory(category: ServiceCategory) {
      this.editingCategoryName.set(category);
      this.editingCategory.set(category);
  }

  saveCategoryEdit() {
      const oldName = this.editingCategory();
      const newName = this.editingCategoryName().trim();
      if (oldName && newName) {
          this.dataService.updateCategory(oldName, newName);
          this.editingCategory.set(null);
      }
  }

  deleteCategory(category: ServiceCategory) {
      if (confirm(`Tem certeza de que deseja excluir a categoria "${category}"? Esta ação não pode ser desfeita.`)) {
          this.dataService.deleteCategory(category);
      }
  }
  
  // --- Professional Management ---
  toggleNewProfessionalSpecialty(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.newProfessionalSpecialties.update(current => isChecked ? [...current, category] : current.filter(c => c !== category));
  }

  resetNewProfessionalForm() {
    this.newProfessionalName.set('');
    this.newProfessionalEmail.set('');
    this.newProfessionalSpecialties.set([]);
    this.showAddProfessionalForm.set(false);
  }

  addProfessional() {
    this.dataService.addProfessional(this.newProfessionalName(), this.newProfessionalEmail(), this.newProfessionalSpecialties());
    this.resetNewProfessionalForm();
  }

  startEditProfessional(pro: User) {
    this.editingProfessionalName.set(pro.name);
    this.editingProfessionalEmail.set(pro.email);
    this.editingProfessionalSpecialties.set([...(pro.specialties || [])]);
    this.editingProfessional.set(pro);
  }

  cancelEditProfessional() {
    this.editingProfessional.set(null);
  }

  saveProfessionalEdit() {
    const pro = this.editingProfessional();
    if (!pro) return;
    this.dataService.updateUser(pro.id, {
      name: this.editingProfessionalName(),
      email: this.editingProfessionalEmail(),
      specialties: this.editingProfessionalSpecialties()
    });
    this.editingProfessional.set(null);
  }

  toggleEditProfessionalSpecialty(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editingProfessionalSpecialties.update(current => isChecked ? [...current, category] : current.filter(c => c !== category));
  }

  // --- Finances ---
  completedRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));

  financialStats = computed(() => {
    const completed = this.completedRequests();
    const taxRate = 0.07;
    const totalRevenueWithTax = completed.filter(r => r.paymentStatus === 'Paid' && r.cost).reduce((sum, r) => sum + r.cost! * (1 + taxRate), 0);
    const outstandingAmountWithTax = completed.filter(r => r.paymentStatus === 'Unpaid' && r.cost).reduce((sum, r) => sum + r.cost! * (1 + taxRate), 0);
    const totalTax = completed.filter(r => r.cost).reduce((sum, r) => sum + r.cost! * taxRate, 0);
    return { completedServices: completed.length, totalRevenue: totalRevenueWithTax, outstandingAmount: outstandingAmountWithTax, totalTax };
  });

  formatCost(cost: number | null): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost ?? 0);
  }

  generateInvoice(request: ServiceRequest) { this.invoiceRequest.set(request); }
  printInvoice() { window.print(); }

  private escapeCsvCell(cell: any): string {
    const cellStr = String(cell ?? '');
    if (/[",\n]/.test(cellStr)) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }

  exportToCSV() {
    const completed = this.completedRequests();
    if (completed.length === 0) {
      this.notificationService.addNotification("Não há dados financeiros para exportar.");
      return;
    }
    const taxRate = 0.07;
    const headers = ['ID', 'Cliente', 'Profissional', 'Serviço', 'Data Conclusão', 'Status Pag.', 'Valor Base', 'Imposto (7%)', 'Valor Total'];
    const rows = completed.map(req => {
      const baseCost = req.cost ?? 0;
      const tax = baseCost * taxRate;
      const totalCost = baseCost + tax;
      const rowData = [
        req.id,
        this.getClientName(req.clientId),
        this.getProfessionalName(req.professionalId),
        req.title,
        req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString('pt-BR') : 'N/A',
        req.paymentStatus === 'Paid' ? 'Pago' : 'Pendente',
        baseCost.toFixed(2),
        tax.toFixed(2),
        totalCost.toFixed(2)
      ];
      return rowData.map(cell => this.escapeCsvCell(cell)).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notificationService.addNotification("Relatório financeiro exportado com sucesso.");
  }
  
  statusClass(status: ServiceStatus): string {
    const colorClasses: Record<ServiceStatus, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800', 'Quoted': 'bg-cyan-100 text-cyan-800',
      'Approved': 'bg-indigo-100 text-indigo-800', 'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800', 'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status]}`;
  }
}
