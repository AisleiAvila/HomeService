import { Component, ChangeDetectionStrategy, input, computed, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, ServiceRequest } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { ServiceListComponent } from '../service-list/service-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ServiceListComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Welcome back, {{ user().name }}!</h2>
        <p class="text-gray-500">Here's a summary of your service requests.</p>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (stat of stats(); track stat.label) {
          <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
             <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full" 
                [class.bg-yellow-100]="stat.icon.includes('yellow')" 
                [class.bg-blue-100]="stat.icon.includes('blue')" 
                [class.bg-green-100]="stat.icon.includes('green')" 
                [class.bg-emerald-100]="stat.icon.includes('emerald')">
               <i class="text-2xl" [class]="stat.icon"></i>
            </div>
            <div>
              <h3 class="text-gray-500 text-sm font-medium">{{ stat.label }}</h3>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ stat.value }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Service Lists -->
      <div>
        <h3 class="text-xl font-semibold text-gray-800 mb-4">Active Requests</h3>
        <app-service-list 
          [serviceRequests]="activeRequests()"
          [currentUser]="user()"
          (viewDetails)="viewDetails.emit($event)"
          (openChat)="openChat.emit($event)"
          (payNow)="payNow.emit($event)">
        </app-service-list>
      </div>

      <div>
        <h3 class="text-xl font-semibold text-gray-800 mb-4">Completed Requests</h3>
        <app-service-list 
          [serviceRequests]="completedRequests()"
          [currentUser]="user()"
          (viewDetails)="viewDetails.emit($event)"
          (openChat)="openChat.emit($event)"
          (payNow)="payNow.emit($event)">
        </app-service-list>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  
  private dataService = inject(DataService);

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
          label: 'Pending Approval', 
          value: requests.filter(r => ['Pending', 'Quoted', 'Approved'].includes(r.status)).length,
          icon: 'fas fa-hourglass-half text-yellow-500'
        },
        { 
          label: 'Active Requests', 
          value: requests.filter(r => ['Assigned', 'In Progress'].includes(r.status)).length,
          icon: 'fas fa-cogs text-blue-500'
        },
        { 
          label: 'Completed', 
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
          label: 'Active Jobs', 
          value: requests.filter(r => ['Assigned', 'In Progress'].includes(r.status)).length,
          icon: 'fas fa-briefcase text-blue-500'
        },
        { 
          label: 'Completed Jobs', 
          value: requests.filter(r => r.status === 'Completed').length,
          icon: 'fas fa-check-double text-green-500'
        },
        { 
          label: 'Total Earnings', 
          value: '$' + earnings.toFixed(2),
          icon: 'fas fa-dollar-sign text-emerald-500'
        },
      ];
    }

    return [];
  });
}