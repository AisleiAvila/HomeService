import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceRequest, UserRole, Address } from './models/maintenance.models';
import { DataService } from './services/data.service';
import { NotificationService } from './services/notification.service';
import { I18nService } from './services/i18n.service';
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
    I18nPipe,
  ],
  template: `
    <!-- Main App Container -->
    <div class="h-screen w-screen bg-gray-100 font-sans antialiased">
      @if (!currentUser()) {
        <!-- Auth Flow -->
        <main class="h-full w-full relative">
          <div class="absolute top-4 right-4 z-10">
            <app-language-switcher />
          </div>
          @switch (authState()) {
            @case ('landing') {
              <div class="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-4">
                <div class="text-center space-y-6 animate-fade-in-up">
                  <!-- Icon -->
                  <div class="bg-white bg-opacity-20 p-6 rounded-full inline-block">
                    <i class="fas fa-tools text-5xl text-white"></i>
                  </div>
            
                  <!-- Title -->
                  <h1 class="text-5xl font-bold tracking-tight">Home Service Pro</h1>
            
                  <!-- Description -->
                  <p class="max-w-xl text-lg text-indigo-100">
                    {{ 'landingDescription' | i18n }}
                  </p>
            
                  <!-- Buttons -->
                  <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button type="button" (click)="authState.set('login')" class="w-full sm:w-auto bg-white text-indigo-600 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-300 transform hover:scale-105">
                      {{ 'signIn' | i18n }}
                    </button>
                    <button type="button" (click)="authState.set('register')" class="w-full sm:w-auto bg-transparent border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white hover:text-indigo-600 transition-colors duration-300 transform hover:scale-105">
                      {{ 'createAccount' | i18n }}
                    </button>
                  </div>
                </div>
              </div>
            }
            @case ('login') {
              <div class="flex items-center justify-center min-h-full p-4">
                <div class="w-full max-w-md space-y-8">
                  <div>
                    <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">{{ 'loginTitle' | i18n }}</h2>
                    <p class="mt-2 text-center text-sm text-gray-600">
                      {{ 'or' | i18n }} <a href="#" (click)="$event.preventDefault(); authState.set('register')" class="font-medium text-indigo-600 hover:text-indigo-500">{{ 'loginCreateAccountLink' | i18n }}</a>
                    </p>
                  </div>
                  <form class="mt-8 space-y-6" (ngSubmit)="login()">
                    <div class="rounded-md shadow-sm -space-y-px">
                      <div>
                        <label for="email" class="sr-only">{{ 'emailPlaceholder' | i18n }}</label>
                        <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="loginEmail"
                               class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                               [placeholder]="'emailPlaceholder' | i18n">
                      </div>
                      <div>
                        <label for="password" class="sr-only">{{ 'passwordPlaceholder' | i18n }}</label>
                        <input id="password" name="password" type="password" autocomplete="current-password" required
                               class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                               [placeholder]="'passwordPlaceholder' | i18n">
                      </div>
                    </div>
                    @if(loginError()){
                      <p class="text-sm text-red-600">{{ loginError() }}</p>
                    }
                    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" (click)="authState.set('landing')"
                                class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto">
                          {{ 'cancel' | i18n }}
                        </button>
                        <button type="submit"
                                class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto">
                          {{ 'signIn' | i18n }}
                        </button>
                    </div>
                  </form>
                </div>
              </div>
            }
            @case ('register') {
              <app-register (registered)="handleRegistration($event)" (switchToLogin)="authState.set('login')" (switchToLanding)="authState.set('landing')"/>
            }
            @case ('verify') {
              <app-verification [email]="verificationEmail()" (verified)="handleVerification($event)" (resendCode)="resendVerificationCode()"/>
            }
          }
        </main>
      } @else {
        <!-- Logged-in View -->
        <div class="flex h-full">
          <!-- Sidebar -->
          <aside class="w-64 bg-gray-800 text-white flex flex-col transition-all duration-300">
            <div class="p-4 border-b border-gray-700">
              <h1 class="text-xl font-bold">Home Service Pro</h1>
            </div>
            <nav class="flex-grow p-2">
              @for(item of navItems(); track item.view) {
                <a href="#" (click)="$event.preventDefault(); setView(item.view)"
                   [class]="'flex items-center px-4 py-2 mt-2 text-sm font-semibold rounded-lg transition-colors duration-200 ' + (currentView() === item.view ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white')">
                  <i [class]="item.icon + ' fa-fw mr-3'"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </nav>
            <div class="p-4 border-t border-gray-700">
              <a href="#" (click)="$event.preventDefault(); logout()"
                 class="flex items-center w-full px-4 py-2 mt-2 text-sm font-semibold text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white">
                <i class="fas fa-sign-out-alt fa-fw mr-3"></i>
                <span>{{ 'logout' | i18n }}</span>
              </a>
            </div>
          </aside>
          
          <!-- Main Content -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Top Bar -->
            <header class="bg-white shadow-md p-4 flex justify-between items-center z-10">
               <h2 class="text-2xl font-semibold text-gray-800">{{ currentViewLabel() }}</h2>
               <div class="flex items-center space-x-4">
                  <app-language-switcher />
                  <div class="relative">
                     <button (click)="showNotifications.set(!showNotifications())" class="relative text-gray-600 hover:text-gray-800 focus:outline-none">
                        <i class="fas fa-bell fa-lg"></i>
                        @if (unreadNotificationsCount() > 0) {
                           <span class="absolute top-0 right-0 -mt-1 -mr-1 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{{ unreadNotificationsCount() }}</span>
                        }
                     </button>
                     @if(showNotifications()) {
                        <app-notification-center (close)="showNotifications.set(false)" class="absolute right-0 mt-2 w-80 z-50"/>
                     }
                  </div>
                  <div class="flex items-center space-x-2">
                     <img [src]="currentUser()?.avatarUrl" alt="User Avatar" class="h-10 w-10 rounded-full object-cover">
                     <div>
                        <div class="font-semibold">{{ currentUser()?.name }}</div>
                        <div class="text-sm text-gray-500 capitalize">{{ currentUser()?.role }}</div>
                     </div>
                  </div>
               </div>
            </header>
            
            <!-- Content Area -->
            <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
               @switch (currentView()) {
                 @case ('dashboard') { <app-dashboard [user]="currentUser()!" (viewDetails)="handleViewDetails($event)" (openChat)="handleOpenChat($event)" (payNow)="handlePayNow($event)"/> }
                 @case ('admin') { <app-admin-dashboard /> }
                 @case ('newRequest') { <app-service-request-form [client]="currentUser()!" (requestSubmitted)="setView('dashboard')"/> }
                 @case ('schedule') { <app-schedule [user]="currentUser()!" (viewDetails)="handleViewDetails($event)"/> }
                 @case ('search') { <app-search [user]="currentUser()!"/> }
                 @case ('profile') { <app-profile [user]="currentUser()!"/> }
                 @case ('chat') { <app-chat [serviceRequest]="selectedServiceRequest()!" [currentUser]="currentUser()!"/> }
                 @case ('details') {
                   @if (selectedServiceRequest(); as request) {
                    <div class="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-3xl font-bold text-gray-800">{{ request.title }}</h3>
                                <p class="text-sm text-gray-500">{{ 'request' | i18n }} #{{ request.id }}</p>
                            </div>
                            <span [class]="statusClass(request.status)">{{ request.status }}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Left Column -->
                            <div class="md:col-span-2 space-y-6">
                                <div>
                                    <h4 class="font-semibold text-gray-700">{{ 'description' | i18n }}</h4>
                                    <p class="text-gray-600 mt-1">{{ request.description }}</p>
                                </div>
                                 <div>
                                    <h4 class="font-semibold text-gray-700">{{ 'address' | i18n }}</h4>
                                    <p class="text-gray-600 mt-1">{{ formatAddress(request.address) }}</p>
                                </div>
                            </div>

                            <!-- Right Column -->
                            <div class="space-y-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h4 class="font-semibold text-gray-700 mb-2">{{ 'details' | i18n }}</h4>
                                    <ul class="text-sm text-gray-600 space-y-2">
                                        <li class="flex justify-between"><span>{{ 'category' | i18n }}:</span> <span class="font-medium">{{ request.category }}</span></li>
                                        <li class="flex justify-between"><span>{{ 'requested' | i18n }}:</span> <span class="font-medium">{{ request.requestedDate | date: 'mediumDate' }}</span></li>
                                        <li class="flex justify-between"><span>{{ 'scheduled' | i18n }}:</span> <span class="font-medium">{{ request.scheduledDate ? (request.scheduledDate | date: 'mediumDate') : ('notSet' | i18n) }}</span></li>
                                    </ul>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h4 class="font-semibold text-gray-700 mb-2">{{ 'financials' | i18n }}</h4>
                                     <ul class="text-sm text-gray-600 space-y-2">
                                        <li class="flex justify-between"><span>{{ 'cost' | i18n }}:</span> <span class="font-medium">{{ request.cost ? (request.cost | currency) : ('notQuoted' | i18n) }}</span></li>
                                        <li class="flex justify-between"><span>{{ 'payment' | i18n }}:</span> <span class="font-medium">{{ request.paymentStatus }}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div class="mt-8 border-t pt-6">
                            <button (click)="setView('dashboard')" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                                <i class="fas fa-arrow-left mr-2"></i>{{ 'backToDashboard' | i18n }}
                            </button>
                        </div>
                    </div>
                   } @else {
                     <p>{{ 'serviceRequestNotFound' | i18n }}</p>
                   }
                 }
               }
            </main>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
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

  unreadNotificationsCount = computed(() => this.notificationService.notifications().filter(n => !n.read).length);

  constructor() {
    // For development, auto-login as a specific user. e.g. 'client', 'professional', 'admin'
    // this.loginEmail = 'admin@email.com';
    // this.login();
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
      'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return baseClass + ' ' + (colorClasses[status] || 'bg-gray-100 text-gray-800');
  }
}