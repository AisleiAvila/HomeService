
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { I18nService } from '../../services/i18n.service';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { User, ServiceRequest, ServiceCategory } from '../../models/maintenance.models';

type AdminView = 'approvals' | 'professionals' | 'categories' | 'finances';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe, CurrencyPipe, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  i18n = inject(I18nService);

  currentView = signal<AdminView>('approvals');
  newCategoryName = signal('');
  
  allUsers = this.dataService.users;
  allRequests = this.dataService.serviceRequests;
  categories = this.dataService.categories;

  pendingApprovals = computed(() => this.allUsers().filter(u => u.status === 'Pending' && u.role === 'professional'));
  activeProfessionals = computed(() => this.allUsers().filter(u => u.status === 'Active' && u.role === 'professional'));
  
  completedRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));

  stats = computed(() => {
    const totalRevenue = this.completedRequests()
      .filter(r => r.payment_status === 'Paid' && r.cost)
      .reduce((sum, r) => sum + r.cost!, 0);

    return [
      { label: this.i18n.translate('totalRevenue'), value: totalRevenue, isCurrency: true },
      { label: this.i18n.translate('pendingApprovals'), value: this.pendingApprovals().length },
      { label: this.i18n.translate('activeServices'), value: this.allRequests().filter(r => r.status === 'In Progress').length },
      { label: this.i18n.translate('totalProfessionals'), value: this.activeProfessionals().length },
    ];
  });

  currencyCode = computed(() => this.i18n.language() === 'pt' ? 'BRL' : 'USD');
  
  getUserName(id: number | null): string {
    if (id === null) return this.i18n.translate('unassigned');
    return this.allUsers().find(u => u.id === id)?.name || this.i18n.translate('unknownClient');
  }

  approveUser(user: User) {
    this.dataService.updateUserStatus(user.id, 'Active');
  }

  rejectUser(user: User) {
    if (confirm(this.i18n.translate('confirmRejectRegistration'))) {
      this.dataService.updateUserStatus(user.id, 'Rejected');
    }
  }

  addCategory() {
    const name = this.newCategoryName().trim();
    if (name && !this.categories().includes(name)) {
      // In a real app, this would be an API call. Here we just update the signal.
      this.dataService.categories.update(cats => [...cats, name]);
      this.newCategoryName.set('');
    }
  }

  deleteCategory(category: ServiceCategory) {
    if (confirm(this.i18n.translate('confirmDeleteCategory', { category }))) {
      this.dataService.categories.update(cats => cats.filter(c => c !== category));
    }
  }
  
  exportFinances() {
    const data = this.completedRequests().filter(r => r.payment_status === 'Paid');
    if (data.length === 0) {
      alert(this.i18n.translate('noDataToExport'));
      return;
    }
    
    const taxRate = 0.07;
    const headers = [
        this.i18n.translate('csvId'),
        this.i18n.translate('csvClient'),
        this.i18n.translate('csvProfessional'),
        this.i18n.translate('csvService'),
        this.i18n.translate('csvCompletionDate'),
        this.i18n.translate('csvPaymentStatus'),
        this.i18n.translate('csvBaseValue'),
        this.i18n.translate('csvTax'),
        this.i18n.translate('csvTotalValue'),
    ];
    
    const rows = data.map(r => [
        r.id,
        this.getUserName(r.client_id),
        this.getUserName(r.professional_id),
        r.title.replace(/,/g, ''), // remove commas
        r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '',
        r.payment_status,
        (r.cost ?? 0).toFixed(2),
        ((r.cost ?? 0) * taxRate).toFixed(2),
        ((r.cost ?? 0) * (1 + taxRate)).toFixed(2)
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(this.i18n.translate('reportExported'));
  }
}
