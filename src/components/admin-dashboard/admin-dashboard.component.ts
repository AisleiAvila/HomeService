import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { User, ServiceRequest, ServiceCategory, ServiceStatus } from '../../models/maintenance.models';
import { I18nService } from '../../services/i18n.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

type AdminView = 'overview' | 'requests' | 'approvals' | 'professionals' | 'categories' | 'finances';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);

  currentView = signal<AdminView>('overview');
  readonly views = computed(() => [
    { id: 'overview' as AdminView, label: this.i18n.translate('overview'), icon: 'fas fa-chart-pie' },
    { id: 'requests' as AdminView, label: this.i18n.translate('requests'), icon: 'fas fa-tasks' },
    { id: 'approvals' as AdminView, label: this.i18n.translate('approvals'), icon: 'fas fa-user-check' },
    { id: 'finances' as AdminView, label: this.i18n.translate('finances'), icon: 'fas fa-file-invoice-dollar' },
    { id: 'professionals' as AdminView, label: this.i18n.translate('professionals'), icon: 'fas fa-users-cog' },
    { id: 'categories' as AdminView, label: this.i18n.translate('categories'), icon: 'fas fa-tags' },
  ]);

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
      { label: this.i18n.translate('totalRevenue'), value: this.formatCost(totalEarnings), icon: 'fas fa-dollar-sign text-green-500', bgColor: 'bg-green-100' },
      { label: this.i18n.translate('pendingApprovals'), value: this.pendingApprovalCount(), icon: 'fas fa-user-clock text-orange-500', bgColor: 'bg-orange-100' },
      { label: this.i18n.translate('activeServices'), value: requests.filter(r => r.status === 'In Progress').length, icon: 'fas fa-running text-blue-500', bgColor: 'bg-blue-100' },
      { label: this.i18n.translate('totalProfessionals'), value: this.professionals().length, icon: 'fas fa-users text-purple-500', bgColor: 'bg-purple-100' }
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
  getClientName(clientId: number): string { return this.allUsers().find(u => u.id === clientId)?.name ?? this.i18n.translate('unknownClient'); }
  getProfessionalName(proId: number | null): string { return proId ? (this.allUsers().find(u => u.id === proId)?.name ?? this.i18n.translate('unassigned')) : this.i18n.translate('unassigned'); }
  getProfessionalsForRequest(category: ServiceCategory): User[] { return this.dataService.getProfessionalsByCategory(category); }

  // --- Client Approval Logic ---
  approveClient(userId: number) { this.dataService.approveClient(userId); }
  rejectClient(userId: number) { if (confirm(this.i18n.translate('confirmRejectRegistration'))) { this.dataService.rejectClient(userId); } }

  // --- Quote & Request Logic ---
  selectRequestForQuote(request: ServiceRequest) { this.quoteAmount.set(request.cost); this.quoteRequest.set(request); }
  submitQuote() { const req = this.quoteRequest(), amt = this.quoteAmount(); if (req && amt && amt > 0) { this.dataService.submitQuote(req.id, amt); this.quoteRequest.set(null); } }
  respondToQuote(requestId: number, approved: boolean) { this.dataService.respondToQuote(requestId, approved); this.quoteRequest.set(null); }

  // --- Assignment Logic ---
  selectRequestForAssignment(request: ServiceRequest) { this.assigningProfessionalId.set(null); this.assignmentRequest.set(request); }
  assignProfessional() { const req = this.assignmentRequest(), proId = this.assigningProfessionalId(); if (req && proId) { this.dataService.assignProfessional(req.id, proId); this.assignmentRequest.set(null); } }
  
  // --- Category Management ---
  addCategory() { const name = this.newCategory().trim(); if (name) { this.dataService.addCategory(name as ServiceCategory); this.newCategory.set(''); } }
  startEditCategory(cat: ServiceCategory) { this.editingCategoryName.set(cat); this.editingCategory.set(cat); }
  saveCategoryEdit() { const oldN = this.editingCategory(), newN = this.editingCategoryName().trim(); if (oldN && newN) { this.dataService.updateCategory(oldN, newN as ServiceCategory); this.editingCategory.set(null); } }
  deleteCategory(cat: ServiceCategory) { if (confirm(this.i18n.translate('confirmDeleteCategory', { category: cat }))) { this.dataService.deleteCategory(cat); } }
  
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
  formatCost(cost: number | null): string {
    const lang = this.i18n.language();
    const currency = lang === 'pt' ? 'BRL' : 'USD';
    const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(cost ?? 0);
  }
  generateInvoice(req: ServiceRequest) { this.invoiceRequest.set(req); }
  printInvoice() { window.print(); }
  private escapeCsvCell(cell: any): string { const str = String(cell ?? ''); return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str; }
  exportToCSV() { const completed = this.completedRequests(); if (completed.length === 0) { this.notificationService.addNotification(this.i18n.translate('noDataToExport')); return; } const taxRate = 0.07; const headers = [this.i18n.translate('csvId'), this.i18n.translate('csvClient'), this.i18n.translate('csvProfessional'), this.i18n.translate('csvService'), this.i18n.translate('csvCompletionDate'), this.i18n.translate('csvPaymentStatus'), this.i18n.translate('csvBaseValue'), this.i18n.translate('csvTax'), this.i18n.translate('csvTotalValue')]; const rows = completed.map(req => [req.id, this.getClientName(req.clientId), this.getProfessionalName(req.professionalId), req.title, req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString(this.i18n.language() === 'pt' ? 'pt-BR' : 'en-US') : 'N/A', req.paymentStatus === 'Paid' ? this.i18n.translate('paid') : this.i18n.translate('unpaid'), (req.cost ?? 0).toFixed(2), ((req.cost ?? 0) * taxRate).toFixed(2), ((req.cost ?? 0) * (1 + taxRate)).toFixed(2)].map(this.escapeCsvCell).join(',')); const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n'); const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `financial_report_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); this.notificationService.addNotification(this.i18n.translate('reportExported')); }
  statusClass(status: ServiceStatus): string { const colors: Record<ServiceStatus, string> = { 'Pending': 'bg-yellow-100 text-yellow-800', 'Quoted': 'bg-cyan-100 text-cyan-800', 'Approved': 'bg-indigo-100 text-indigo-800', 'Assigned': 'bg-blue-100 text-blue-800', 'In Progress': 'bg-purple-100 text-purple-800', 'Completed': 'bg-green-100 text-green-800', 'Cancelled': 'bg-gray-100 text-gray-800', }; return `px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`; }
}