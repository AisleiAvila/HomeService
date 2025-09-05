import { Component, ChangeDetectionStrategy, input, computed, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, ServiceRequest } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { ServiceListComponent } from '../service-list/service-list.component';
import { I18nService } from '../../services/i18n.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ServiceListComponent, I18nPipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  
  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  private userRequests = computed(() => {
    const allRequests = this.dataService.serviceRequests();
    const currentUser = this.user();
    if (currentUser.role === 'client') {
      return allRequests.filter(r => r.clientId === currentUser.id);
    } else if (currentUser.role === 'professional') {
      return allRequests.filter(r => r.professionalId === currentUser.id);
    }
    return [];
  });

  activeRequests = computed(() => this.userRequests().filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'));
  completedRequests = computed(() => this.userRequests().filter(r => r.status === 'Completed'));

  stats = computed(() => {
    const currentUser = this.user();
    const requests = this.userRequests();
    
    if (currentUser.role === 'client') {
      return [
        { 
          label: this.i18n.translate('pendingApproval'), 
          value: requests.filter(r => ['Pending', 'Quoted', 'Approved'].includes(r.status)).length,
          icon: 'fas fa-hourglass-half text-yellow-500'
        },
        { 
          label: this.i18n.translate('activeRequests'), 
          value: requests.filter(r => ['Assigned', 'In Progress', 'Scheduled'].includes(r.status)).length,
          icon: 'fas fa-cogs text-blue-500'
        },
        { 
          label: this.i18n.translate('completed'), 
          value: requests.filter(r => r.status === 'Completed').length,
          icon: 'fas fa-check-circle text-green-500'
        },
      ];
    }
    
    if (currentUser.role === 'professional') {
      const earnings = requests
        .filter(r => r.paymentStatus === 'Paid' && r.cost)
        .reduce((sum, r) => sum + r.cost!, 0);

      return [
        { 
          label: this.i18n.translate('activeJobs'), 
          value: requests.filter(r => ['Assigned', 'In Progress', 'Scheduled'].includes(r.status)).length,
          icon: 'fas fa-briefcase text-blue-500'
        },
        { 
          label: this.i18n.translate('completedJobs'), 
          value: requests.filter(r => r.status === 'Completed').length,
          icon: 'fas fa-check-double text-green-500'
        },
        { 
          label: this.i18n.translate('totalEarnings'), 
          value: this.i18n.language() === 'pt' ? `R$${earnings.toFixed(2)}` : `$${earnings.toFixed(2)}`,
          icon: 'fas fa-dollar-sign text-emerald-500'
        },
      ];
    }

    return [];
  });
  
  handleQuoteResponse(request: ServiceRequest, approved: boolean) {
    this.dataService.respondToQuote(request.id, approved);
  }
}