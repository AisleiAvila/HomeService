import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceRequest, UserRole, Address } from './models/maintenance.models';
import { DataService } from './services/data.service';
import { NotificationService } from './services/notification.service';
import { I18nService } from './services/i18n.service';
import { PushNotificationService } from './services/push-notification.service';
import { I18nPipe } from './pipes/i18n.pipe';

// Components
import { RegisterComponent } from './components/register/register.component';
import { VerificationComponent } from './components/verification/verification.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ServiceRequestFormComponent } from './components/service-request-form/service-request-form.component';
import { ChatComponent } from './components/chat/chat.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { SearchComponent } from './components/search/search.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { ServiceListComponent } from './components/service-list/service-list.component';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { SchedulerComponent } from './components/scheduler/scheduler.component';

type AppView = 'dashboard' | 'newRequest' | 'details' | 'chat' | 'profile' | 'schedule' | 'search' | 'admin';
type AuthState = 'landing' | 'login' | 'register' | 'verify';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RegisterComponent,
    VerificationComponent,
    DashboardComponent,
    ServiceRequestFormComponent,
    ChatComponent,
    AdminDashboardComponent,
    ProfileComponent,
    ScheduleComponent,
    SearchComponent,
    NotificationCenterComponent,
    ServiceListComponent,
    LanguageSwitcherComponent,
    SchedulerComponent,
    I18nPipe,
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  pushNotificationService = inject(PushNotificationService);
  private i18n = inject(I18nService);

  // Auth state
  authState = signal<AuthState>('landing');
  currentUser = signal<User | null>(null);
  loginEmail = '';
  loginError = signal<string | null>(null);
  verificationEmail = signal('');
  
  // App state
  currentView = signal<AppView>('dashboard');
  selectedServiceRequest = signal<ServiceRequest | null>(null);
  showNotifications = signal(false);
  isSidebarCollapsed = signal(false);
  schedulingRequest = signal<ServiceRequest | null>(null);

  unreadNotificationsCount = computed(() => this.notificationService.notifications().filter(n => !n.read).length);

  authTheme = computed<'light' | 'dark'>(() => {
    return this.authState() === 'landing' ? 'light' : 'dark';
  });

  ngOnInit() {
    this.pushNotificationService.init();
  }

  // --- Auth Logic ---
  login() {
    this.loginError.set(null);
    const user = this.dataService.users().find(u => u.email.toLowerCase() === this.loginEmail.toLowerCase());
    if (user) {
      if (user.status === 'Pending') {
        this.loginError.set(this.i18n.translate('accountPending'));
        return;
      }
      if (user.status === 'Rejected') {
        this.loginError.set(this.i18n.translate('accountRejected'));
        return;
      }
      this.currentUser.set(user);
      this.currentView.set(user.role === 'admin' ? 'admin' : 'dashboard');
      this.notificationService.addNotification(this.i18n.translate('welcomeBack', { name: user.name }));
    } else {
      this.loginError.set(this.i18n.translate('invalidCredentials'));
    }
  }

  logout() {
    this.currentUser.set(null);
    this.authState.set('landing');
  }

  handleRegistration(event: { email: string; role: UserRole }) {
    this.notificationService.addNotification(this.i18n.translate('registrationSuccess'));
    this.verificationEmail.set(event.email);
    this.authState.set('verify');
  }

  handleVerification(code: string) {
    this.notificationService.addNotification(this.i18n.translate('accountVerified'));
    // In a real app, we'd add the user to the dataService here.
    // For now, we just switch to login.
    this.authState.set('login');
  }

  resendVerificationCode() {
    this.notificationService.addNotification(this.i18n.translate('verificationCodeResent', { email: this.verificationEmail() }));
  }

  // --- Navigation & View Logic ---
  toggleSidebar() {
    this.isSidebarCollapsed.update(collapsed => !collapsed);
  }
  
  navItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];

    const baseNav = [
      { view: 'dashboard' as AppView, label: this.i18n.translate('dashboard'), icon: 'fas fa-tachometer-alt' },
      { view: 'schedule' as AppView, label: this.i18n.translate('schedule'), icon: 'fas fa-calendar-alt' },
      { view: 'search' as AppView, label: this.i18n.translate('search'), icon: 'fas fa-search' },
      { view: 'profile' as AppView, label: this.i18n.translate('profile'), icon: 'fas fa-user-circle' },
    ];
    
    if (user.role === 'client') {
      return [{ view: 'newRequest' as AppView, label: this.i18n.translate('newRequest'), icon: 'fas fa-plus-circle' }, ...baseNav];
    }
    if (user.role === 'professional') {
      return baseNav;
    }
    if (user.role === 'admin') {
      return [
        { view: 'admin' as AppView, label: this.i18n.translate('adminPanel'), icon: 'fas fa-shield-alt' },
        { view: 'schedule' as AppView, label: this.i18n.translate('schedule'), icon: 'fas fa-calendar-alt' },
        { view: 'profile' as AppView, label: this.i18n.translate('profile'), icon: 'fas fa-user-circle' }
      ];
    }
    return [];
  });

  currentViewLabel = computed(() => {
    const view = this.currentView();
    if (view === 'details' && this.selectedServiceRequest()) {
      return this.i18n.translate('detailsFor', { title: this.selectedServiceRequest()?.title ?? '' });
    }
     if (view === 'chat' && this.selectedServiceRequest()) {
      return this.i18n.translate('chatFor', { title: this.selectedServiceRequest()?.title ?? '' });
    }
    const navItem = this.navItems().find(item => item.view === view);
    return navItem ? navItem.label : this.i18n.translate('dashboard');
  });

  setView(view: AppView) {
    this.currentView.set(view);
  }

  // --- Event Handlers from Child Components ---
  handleViewDetails(request: ServiceRequest) {
    this.selectedServiceRequest.set(request);
    this.currentView.set('details');
  }
  
  handleOpenChat(request: ServiceRequest) {
    this.selectedServiceRequest.set(request);
    this.currentView.set('chat');
  }

  handlePayNow(request: ServiceRequest) {
    // In a real app, this would integrate with a payment gateway.
    this.notificationService.addNotification(this.i18n.translate('paymentProcessStarted', { title: request.title }));
  }

  formatAddress(address: Address): string {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  }

  statusClass(status: string): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const colorClasses: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Quoted': 'bg-cyan-100 text-cyan-800',
      'Approved': 'bg-indigo-100 text-indigo-800',
      'Scheduled': 'bg-teal-100 text-teal-800',
      'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return baseClass + ' ' + (colorClasses[status] || 'bg-gray-100 text-gray-800');
  }
  
  // --- Scheduler Modal Logic ---
  handleScheduleRequest(request: ServiceRequest) {
    this.schedulingRequest.set(request);
  }
  
  closeScheduler() {
    this.schedulingRequest.set(null);
  }
  
  handleAppointmentConfirmed(event: { requestId: number, professionalId: number, date: Date }) {
    this.dataService.scheduleAppointment(event.requestId, event.professionalId, event.date);
    this.closeScheduler();
  }
}
