import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from './services/data.service';
import { NotificationService } from './services/notification.service';
import { User, ServiceRequest, Address } from './models/maintenance.models';

// Components
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ChatComponent } from './components/chat/chat.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { SearchComponent } from './components/search/search.component';
import { ServiceRequestFormComponent } from './components/service-request-form/service-request-form.component';

type View = 'dashboard' | 'new_request' | 'schedule' | 'search' | 'profile' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardComponent,
    AdminDashboardComponent,
    ChatComponent,
    NotificationCenterComponent,
    ProfileComponent,
    ScheduleComponent,
    SearchComponent,
    ServiceRequestFormComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  allUsers = this.dataService.users;
  
  // Hold the ID of the current user in a signal
  currentUserId = signal<number>(this.allUsers()[0]?.id ?? 1);

  // Derive the current user object from the ID and the master user list
  currentUser = computed(() => {
    return this.allUsers().find(u => u.id === this.currentUserId()) ?? null;
  });

  currentView = signal<View>('dashboard');
  
  viewingRequest = signal<ServiceRequest | null>(null);
  chattingRequest = signal<ServiceRequest | null>(null);
  requestForPayment = signal<ServiceRequest | null>(null);
  showNotifications = signal(false);

  unreadNotificationsCount = computed(() => this.notificationService.notifications().filter(n => !n.read).length);

  availableViews = computed(() => {
    const userRole = this.currentUser()?.role;
    const views: { id: View, label: string, icon: string }[] = [];

    if (userRole === 'admin') {
      views.push({ id: 'admin', label: 'Admin Panel', icon: 'fas fa-shield-alt' });
    } else {
      views.push({ id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' });
    }
    if (userRole === 'client') {
      views.push({ id: 'new_request', label: 'New Request', icon: 'fas fa-plus-circle' });
    }
    views.push({ id: 'schedule', label: 'Schedule', icon: 'fas fa-calendar-alt' });
    views.push({ id: 'search', label: 'Search Services', icon: 'fas fa-search' });
    
    return views;
  });

  currentViewLabel = computed(() => {
    const view = this.availableViews().find(v => v.id === this.currentView());
    if (this.currentView() === 'profile') return 'My Profile';
    return view ? view.label : 'Dashboard';
  });

  changeUser(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const userId = parseInt(selectElement.value, 10);
    this.currentUserId.set(userId);
    
    // Now we can use the computed signal to check the role
    if (this.currentUser()?.role === 'admin') {
        this.setView('admin');
    } else {
        this.setView('dashboard');
    }
    this.closeModals();
  }

  setView(view: View) {
    this.currentView.set(view);
  }

  handleViewDetails(request: ServiceRequest) {
    this.viewingRequest.set(request);
  }

  handleOpenChat(request: ServiceRequest) {
    this.chattingRequest.set(request);
  }

  handlePayNow(request: ServiceRequest) {
    this.requestForPayment.set(request);
  }
  
  submitPayment() {
      const request = this.requestForPayment();
      if (request) {
        this.dataService.processPayment(request.id);
      }
      this.closeModals();
  }

  formatCost(cost: number | null): string {
    if (cost) {
      return '$' + cost.toFixed(2);
    }
    return '$0.00';
  }

  closeModals() {
    this.viewingRequest.set(null);
    this.chattingRequest.set(null);
    this.requestForPayment.set(null);
  }

  formatAddress(address: Address): string {
    return address.street + ', ' + address.city + ', ' + address.state + ' ' + address.zipCode;
  }

  statusClass(status: string): string {
    const baseClass = 'px-2 py-1 text-xs font-semibold rounded-full';
    const colorClasses: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Quoted': 'bg-cyan-100 text-cyan-800',
      'Approved': 'bg-indigo-100 text-indigo-800',
      'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    const colorClass = colorClasses[status] || 'bg-gray-100 text-gray-800';
    return baseClass + ' ' + colorClass;
  }
}
