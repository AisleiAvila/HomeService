import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { User, ServiceRequest, ServiceCategory, ServiceStatus } from '../../models/maintenance.models';

type AdminView = 'overview' | 'requests' | 'approvals' | 'professionals' | 'categories' | 'finances';

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
    { id: 'approvals', label: 'Aprovações', icon: 'fas fa-user-check' },
    { id: 'finances', label: 'Finanças', icon: 'fas fa-file-invoice-dollar' },
    { id: 'professionals', label: 'Profissionais', icon: 'fas fa-users-cog' },
    { id: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
  ];

  allRequests = this.dataService.serviceRequests;
  allUsers = this.dataService.users;
  allCategories = this.dataService.categories;

  professionals = computed(() => this.allUsers().filter(u => u.role === 'professional'));
  
  actionableRequests = computed(() => this.allRequests().filter(r => ['Pending', 'Quoted', 'Approved'].includes(r.status)).sort((a,b) => a.requestedDate.getTime() - b.requestedDate.getTime()));

  pendingRegistrations = computed(() => this.allUsers().filter(u => u.role === 'client' && u.status === 'Pending'));
  pendingApprovalCount = computed(() => this.pendingRegistrations().length);

  stats = computed(() => {
    const requests = this.allRequests();
    const totalEarnings = requests
      .filter(r => r.paymentStatus === 'Paid' && r.cost)
      .reduce((sum, r) => sum + r.cost! * 1.07, 0);

    return [
      { label: 'Receita Total', value: this.formatCost(totalEarnings), icon: 'fas fa-dollar-sign text-green-500', bgColor: 'bg-green-100' },
      { label: 'Aprovações Pendentes', value: this.pendingApprovalCount(), icon: 'fas fa-user-clock text-orange-500', bgColor: 'bg-orange-100' },
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


  setView(view: AdminView) { this.currentView.set(view); }
  getClientName(clientId: number): string { return this.allUsers().find(u => u.id === clientId)?.name ?? 'Cliente Desconhecido'; }
  getProfessionalName(proId: number | null): string { return proId ? (this.allUsers().find(u => u.id === proId)?.name ?? 'Não atribuído') : 'Não atribuído'; }
  getProfessionalsForRequest(category: ServiceCategory): User[] { return this.dataService.getProfessionalsByCategory(category); }

  // --- Client Approval Logic ---
  approveClient(userId: number) { this.dataService.approveClient(userId); }
  rejectClient(userId: number) { if (confirm('Tem certeza de que deseja rejeitar este cadastro?')) { this.dataService.rejectClient(userId); } }

  // --- Quote & Request Logic ---
  selectRequestForQuote(request: ServiceRequest) { this.quoteAmount.set(request.cost); this.quoteRequest.set(request); }
  submitQuote() { const req = this.quoteRequest(), amt = this.quoteAmount(); if (req && amt && amt > 0) { this.dataService.submitQuote(req.id, amt); this.quoteRequest.set(null); } }
  respondToQuote(requestId: number, approved: boolean) { this.dataService.respondToQuote(requestId, approved); this.quoteRequest.set(null); }

  // --- Assignment Logic ---
  selectRequestForAssignment(request: ServiceRequest) { this.assigningProfessionalId.set(null); this.assignmentRequest.set(request); }
  assignProfessional() { const req = this.assignmentRequest(), proId = this.assigningProfessionalId(); if (req && proId) { this.dataService.assignProfessional(req.id, proId); this.assignmentRequest.set(null); } }
  
  // --- Category Management ---
  addCategory() { const name = this.newCategory().trim(); if (name) { this.dataService.addCategory(name); this.newCategory.set(''); } }
  startEditCategory(cat: ServiceCategory) { this.editingCategoryName.set(cat); this.editingCategory.set(cat); }
  saveCategoryEdit() { const oldN = this.editingCategory(), newN = this.editingCategoryName().trim(); if (oldN && newN) { this.dataService.updateCategory(oldN, newN); this.editingCategory.set(null); } }
  deleteCategory(cat: ServiceCategory) { if (confirm(`Tem certeza de que deseja excluir a categoria "${cat}"?`)) { this.dataService.deleteCategory(cat); } }
  
  // --- Professional Management ---
  toggleNewProfessionalSpecialty(cat: ServiceCategory, event: Event) { const checked = (event.target as HTMLInputElement).checked; this.newProfessionalSpecialties.update(curr => checked ? [...curr, cat] : curr.filter(c => c !== cat)); }
  resetNewProfessionalForm() { this.newProfessionalName.set(''); this.newProfessionalEmail.set(''); this.newProfessionalSpecialties.set([]); this.showAddProfessionalForm.set(false); }
  addProfessional() { this.dataService.addProfessional(this.newProfessionalName(), this.newProfessionalEmail(), this.newProfessionalSpecialties()); this.resetNewProfessionalForm(); }
  startEditProfessional(pro: User) { this.editingProfessionalName.set(pro.name); this.editingProfessionalEmail.set(pro.email); this.editingProfessionalSpecialties.set([...(pro.specialties || [])]); this.editingProfessional.set(pro); }
  cancelEditProfessional() { this.editingProfessional.set(null); }
  saveProfessionalEdit() { const pro = this.editingProfessional(); if (!pro) return; this.dataService.updateUser(pro.id, { name: this.editingProfessionalName(), email: this.editingProfessionalEmail(), specialties: this.editingProfessionalSpecialties() }); this.editingProfessional.set(null); }
  toggleEditProfessionalSpecialty(cat: ServiceCategory, event: Event) { const checked = (event.target as HTMLInputElement).checked; this.editingProfessionalSpecialties.update(curr => checked ? [...curr, cat] : curr.filter(c => c !== cat)); }

  // --- Finances ---
  completedRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));
  financialStats = computed(() => { const completed = this.completedRequests(), taxRate = 0.07; const totalRevenue = completed.filter(r => r.paymentStatus === 'Paid' && r.cost).reduce((s, r) => s + r.cost! * (1 + taxRate), 0); const outstanding = completed.filter(r => r.paymentStatus === 'Unpaid' && r.cost).reduce((s, r) => s + r.cost! * (1 + taxRate), 0); const totalTax = completed.filter(r => r.cost).reduce((s, r) => s + r.cost! * taxRate, 0); return { completedServices: completed.length, totalRevenue, outstandingAmount: outstanding, totalTax }; });
  formatCost(cost: number | null): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost ?? 0); }
  generateInvoice(req: ServiceRequest) { this.invoiceRequest.set(req); }
  printInvoice() { window.print(); }
  private escapeCsvCell(cell: any): string { const str = String(cell ?? ''); return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str; }
  exportToCSV() { const completed = this.completedRequests(); if (completed.length === 0) { this.notificationService.addNotification("Não há dados para exportar."); return; } const taxRate = 0.07; const headers = ['ID', 'Cliente', 'Profissional', 'Serviço', 'Data Conclusão', 'Status Pag.', 'Valor Base', 'Imposto (7%)', 'Valor Total']; const rows = completed.map(req => [req.id, this.getClientName(req.clientId), this.getProfessionalName(req.professionalId), req.title, req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString('pt-BR') : 'N/A', req.paymentStatus === 'Paid' ? 'Pago' : 'Pendente', (req.cost ?? 0).toFixed(2), ((req.cost ?? 0) * taxRate).toFixed(2), ((req.cost ?? 0) * (1 + taxRate)).toFixed(2)].map(this.escapeCsvCell).join(',')); const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n'); const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); this.notificationService.addNotification("Relatório exportado."); }
  statusClass(status: ServiceStatus): string { const colors: Record<ServiceStatus, string> = { 'Pending': 'bg-yellow-100 text-yellow-800', 'Quoted': 'bg-cyan-100 text-cyan-800', 'Approved': 'bg-indigo-100 text-indigo-800', 'Assigned': 'bg-blue-100 text-blue-800', 'In Progress': 'bg-purple-100 text-purple-800', 'Completed': 'bg-green-100 text-green-800', 'Cancelled': 'bg-gray-100 text-gray-800', }; return `px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`; }
}
