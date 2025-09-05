import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceRequest, UserRole, Address } from './models/maintenance.models';
import { DataService } from './services/data.service';
import { NotificationService } from './services/notification.service';

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

type AppView = 'dashboard' | 'newRequest' | 'details' | 'chat' | 'profile' | 'schedule' | 'search' | 'admin';
type AuthState = 'login' | 'register' | 'verify';

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
  ],
  template: `
    <!-- Main App Container -->
    <div class="h-screen w-screen bg-gray-100 font-sans antialiased">
      @if (!currentUser()) {
        <!-- Auth Flow -->
        <main class="h-full w-full">
          @switch (authState()) {
            @case ('login') {
              <div class="flex items-center justify-center min-h-full p-4">
                <div class="w-full max-w-md space-y-8">
                  <div>
                    <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">Sign in to your account</h2>
                    <p class="mt-2 text-center text-sm text-gray-600">
                      Or <a href="#" (click)="$event.preventDefault(); authState.set('register')" class="font-medium text-indigo-600 hover:text-indigo-500">start your 14-day free trial</a>
                    </p>
                  </div>
                  <form class="mt-8 space-y-6" (ngSubmit)="login()">
                    <div class="rounded-md shadow-sm -space-y-px">
                      <div>
                        <label for="email" class="sr-only">Email address</label>
                        <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="loginEmail"
                               class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                               placeholder="Email address">
                      </div>
                      <div>
                        <label for="password" class="sr-only">Password</label>
                        <input id="password" name="password" type="password" autocomplete="current-password" required
                               class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                               placeholder="Password">
                      </div>
                    </div>
                    @if(loginError()){
                      <p class="text-sm text-red-600">{{ loginError() }}</p>
                    }
                    <div>
                      <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Sign in
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            }
            @case ('register') {
              <app-register (registered)="handleRegistration($event)" (switchToLogin)="authState.set('login')"/>
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
              <h1 class="text-xl font-bold">Manutenção App</h1>
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
                <span>Sair</span>
              </a>
            </div>
          </aside>
          
          <!-- Main Content -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Top Bar -->
            <header class="bg-white shadow-md p-4 flex justify-between items-center z-10">
               <h2 class="text-2xl font-semibold text-gray-800">{{ currentViewLabel() }}</h2>
               <div class="flex items-center space-x-4">
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
                                <p class="text-sm text-gray-500">Request #{{ request.id }}</p>
                            </div>
                            <span [class]="statusClass(request.status)">{{ request.status }}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Left Column -->
                            <div class="md:col-span-2 space-y-6">
                                <div>
                                    <h4 class="font-semibold text-gray-700">Description</h4>
                                    <p class="text-gray-600 mt-1">{{ request.description }}</p>
                                </div>
                                 <div>
                                    <h4 class="font-semibold text-gray-700">Address</h4>
                                    <p class="text-gray-600 mt-1">{{ formatAddress(request.address) }}</p>
                                </div>
                            </div>

                            <!-- Right Column -->
                            <div class="space-y-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h4 class="font-semibold text-gray-700 mb-2">Details</h4>
                                    <ul class="text-sm text-gray-600 space-y-2">
                                        <li class="flex justify-between"><span>Category:</span> <span class="font-medium">{{ request.category }}</span></li>
                                        <li class="flex justify-between"><span>Requested:</span> <span class="font-medium">{{ request.requestedDate | date: 'mediumDate' }}</span></li>
                                        <li class="flex justify-between"><span>Scheduled:</span> <span class="font-medium">{{ request.scheduledDate ? (request.scheduledDate | date: 'mediumDate') : 'Not set' }}</span></li>
                                    </ul>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h4 class="font-semibold text-gray-700 mb-2">Financials</h4>
                                     <ul class="text-sm text-gray-600 space-y-2">
                                        <li class="flex justify-between"><span>Cost:</span> <span class="font-medium">{{ request.cost ? (request.cost | currency) : 'Not quoted' }}</span></li>
                                        <li class="flex justify-between"><span>Payment:</span> <span class="font-medium">{{ request.paymentStatus }}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div class="mt-8 border-t pt-6">
                            <button (click)="setView('dashboard')" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                                <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                            </button>
                        </div>
                    </div>
                   } @else {
                     <p>Pedido de serviço não encontrado.</p>
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

  // Auth state
  authState = signal<AuthState>('login');
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
        this.loginError.set("Your account is pending approval.");
        return;
      }
      if (user.status === 'Rejected') {
        this.loginError.set("Your account has been rejected.");
        return;
      }
      this.currentUser.set(user);
      this.currentView.set(user.role === 'admin' ? 'admin' : 'dashboard');
      this.notificationService.addNotification(`Welcome back, ${user.name}!`);
    } else {
      this.loginError.set("Invalid credentials.");
    }
  }

  logout() {
    this.currentUser.set(null);
    this.authState.set('login');
  }

  handleRegistration(event: { email: string; role: UserRole }) {
    this.notificationService.addNotification("Registration successful! Please check your email to verify your account.");
    this.verificationEmail.set(event.email);
    this.authState.set('verify');
  }

  handleVerification(code: string) {
    this.notificationService.addNotification("Account verified! Please log in.");
    // In a real app, we'd add the user to the dataService here.
    // For now, we just switch to login.
    this.authState.set('login');
  }

  resendVerificationCode() {
    this.notificationService.addNotification(`Verification code resent to ${this.verificationEmail()}.`);
  }

  // --- Navigation & View Logic ---
  navItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];

    const baseNav = [
      { view: 'dashboard' as AppView, label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
      { view: 'schedule' as AppView, label: 'Schedule', icon: 'fas fa-calendar-alt' },
      { view: 'search' as AppView, label: 'Search', icon: 'fas fa-search' },
      { view: 'profile' as AppView, label: 'Profile', icon: 'fas fa-user-circle' },
    ];
    
    if (user.role === 'client') {
      return [{ view: 'newRequest' as AppView, label: 'New Request', icon: 'fas fa-plus-circle' }, ...baseNav];
    }
    if (user.role === 'professional') {
      return baseNav;
    }
    if (user.role === 'admin') {
      return [{ view: 'admin' as AppView, label: 'Admin Panel', icon: 'fas fa-shield-alt' }];
    }
    return [];
  });

  currentViewLabel = computed(() => {
    const view = this.currentView();
    if (view === 'details' && this.selectedServiceRequest()) {
      return `Details for: ${this.selectedServiceRequest()?.title}`;
    }
     if (view === 'chat' && this.selectedServiceRequest()) {
      return `Chat for: ${this.selectedServiceRequest()?.title}`;
    }
    const navItem = this.navItems().find(item => item.view === view);
    return navItem ? navItem.label : 'Dashboard';
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
    this.notificationService.addNotification(`Payment process started for "${request.title}".`);
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
