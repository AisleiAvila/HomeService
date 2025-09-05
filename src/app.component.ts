
import { Component, ChangeDetectionStrategy, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// Models
import { User, ServiceRequest } from './models/maintenance.models';

// Services
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';

// Child Components
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent, LoginPayload } from './components/login/login.component';
import { RegisterComponent, RegisterPayload } from './components/register/register.component';
import { VerificationComponent } from './components/verification/verification.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { SearchComponent } from './components/search/search.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { ServiceRequestFormComponent } from './components/service-request-form/service-request-form.component';
import { SchedulerComponent } from './components/scheduler/scheduler.component';
import { ChatComponent } from './components/chat/chat.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { I18nPipe } from './pipes/i18n.pipe';

type View =
  | 'landing'
  | 'login'
  | 'register'
  | 'verification'
  | 'dashboard'
  | 'profile'
  | 'search'
  | 'schedule'
  | 'admin';

type Modal = 
  | 'none' 
  | 'new-request' 
  | 'chat' 
  | 'scheduler';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    I18nPipe,
    LandingComponent,
    LoginComponent,
    RegisterComponent,
    VerificationComponent,
    DashboardComponent,
    AdminDashboardComponent,
    ProfileComponent,
    SearchComponent,
    ScheduleComponent,
    ServiceRequestFormComponent,
    SchedulerComponent,
    ChatComponent,
    NotificationCenterComponent,
    LanguageSwitcherComponent,
  ],
  template: `
<div class="h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans antialiased overflow-hidden">
  
  <!-- Language switcher for auth pages -->
  @if (isAuthView()) {
    <div class="fixed top-4 right-4 z-10">
      <app-language-switcher [theme]="authViewTheme()" />
    </div>
  }

  @switch (view()) {
    @case ('landing') {
      <app-landing 
        (signIn)="setView('login')"
        (createAccount)="setView('register')" />
    }
    @case ('login') {
      <app-login 
        (login)="handleLogin($event)"
        (createAccount)="setView('register')"
        (cancel)="setView('landing')" 
        (forgotPassword)="handleForgotPassword($event)"/>
    }
    @case ('register') {
      <app-register 
        (registered)="handleRegister($event)"
        (switchToLogin)="setView('login')"
        (switchToLanding)="setView('landing')" />
    }
    @case ('verification') {
      <div class="fixed top-4 right-4 z-10">
        <app-language-switcher [theme]="authViewTheme()" />
      </div>
      <app-verification 
        [email]="verificationEmail()"
        (verified)="handleVerification($event)" />
    }
    @default {
      <!-- Main Authenticated Layout -->
      @if (currentUser(); as user) {
        <div class="flex h-full">
          <!-- Sidebar (Desktop) -->
          <aside class="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 shadow-lg shrink-0">
            <div class="flex items-center justify-center h-20 border-b dark:border-gray-700">
              <i class="fas fa-tools text-2xl text-indigo-500 mr-2"></i>
              <span class="text-xl font-bold">FixItNow</span>
            </div>
            <nav class="flex-1 p-4 space-y-2">
              @if (user.role !== 'admin') {
                <a (click)="setView('dashboard')" [class.bg-indigo-500]="view() === 'dashboard'" [class.text-white]="view() === 'dashboard'" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <i class="fas fa-tachometer-alt w-6"></i><span class="ml-3">{{ 'dashboard' | i18n }}</span>
                </a>
                <a (click)="setView('schedule')" [class.bg-indigo-500]="view() === 'schedule'" [class.text-white]="view() === 'schedule'" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <i class="fas fa-calendar-alt w-6"></i><span class="ml-3">{{ 'schedule' | i18n }}</span>
                </a>
                <a (click)="setView('search')" [class.bg-indigo-500]="view() === 'search'" [class.text-white]="view() === 'search'" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <i class="fas fa-search w-6"></i><span class="ml-3">{{ 'search' | i18n }}</span>
                </a>
              } @else {
                <a (click)="setView('admin')" [class.bg-indigo-500]="view() === 'admin'" [class.text-white]="view() === 'admin'" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <i class="fas fa-user-shield w-6"></i><span class="ml-3">{{ 'adminPanel' | i18n }}</span>
                </a>
              }
            </nav>
            <div class="p-4 border-t dark:border-gray-700">
              <a (click)="setView('profile')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <img [src]="user.avatar_url || 'https://i.pravatar.cc/40?u=' + user.id" alt="User Avatar" class="w-8 h-8 rounded-full mr-3">
                <span class="font-semibold truncate">{{ user.name }}</span>
              </a>
              <a (click)="handleLogout()" class="flex items-center p-3 mt-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer transition-colors">
                <i class="fas fa-sign-out-alt w-6"></i><span class="ml-3">{{ 'logout' | i18n }}</span>
              </a>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="flex-1 flex flex-col overflow-hidden">
            <!-- Top Header -->
            <header class="flex items-center justify-between h-20 px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0">
              <!-- Mobile Menu Button -->
              <button class="md:hidden text-2xl" (click)="isSidebarOpen.set(!isSidebarOpen())">
                <i class="fas fa-bars"></i>
              </button>
              
              <h1 class="text-2xl font-semibold capitalize hidden md:block">{{ view() | i18n }}</h1>
              
              <div class="flex items-center space-x-4">
                @if (user.role === 'client') {
                  <button (click)="openModal('new-request')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors hidden sm:block">
                    <i class="fas fa-plus mr-2"></i> {{ 'newRequest' | i18n }}
                  </button>
                }
                <div class="relative">
                  <button (click)="isNotificationsOpen.set(true)" class="text-2xl">
                    <i class="fas fa-bell"></i>
                    @if(hasUnreadNotifications()) {
                      <span class="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>
                    }
                  </button>
                </div>
                <app-language-switcher theme="dark" />
              </div>
            </header>

            <!-- Page Content -->
            <div class="flex-1 overflow-y-auto p-6">
              @switch(view()) {
                @case('dashboard') { <app-dashboard [user]="user" (openChat)="openModal('chat', $event)" (scheduleRequest)="openModal('scheduler', $event)" /> }
                @case('profile') { <app-profile [user]="user" /> }
                @case('search') { <app-search [user]="user" /> }
                @case('schedule') { <app-schedule [user]="user" /> }
                @case('admin') { <app-admin-dashboard /> }
              }
            </div>
          </main>
          
          <!-- Mobile Sidebar -->
          @if (isSidebarOpen()) {
            <div class="fixed inset-0 bg-black/50 z-40 md:hidden" (click)="isSidebarOpen.set(false)"></div>
            <aside class="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform" [class.translate-x-0]="isSidebarOpen()" [class.-translate-x-full]="!isSidebarOpen()">
               <!-- Mobile menu content copied from desktop sidebar -->
              <div class="flex items-center justify-between h-20 px-4 border-b dark:border-gray-700">
                <span class="text-xl font-bold">FixItNow</span>
                <button (click)="isSidebarOpen.set(false)" class="text-2xl"><i class="fas fa-times"></i></button>
              </div>
              <nav class="flex-1 p-4 space-y-2">
                @if (user.role !== 'admin') {
                  <a (click)="setView('dashboard')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                    <i class="fas fa-tachometer-alt w-6"></i><span class="ml-3">{{ 'dashboard' | i18n }}</span>
                  </a>
                  <a (click)="setView('schedule')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                    <i class="fas fa-calendar-alt w-6"></i><span class="ml-3">{{ 'schedule' | i18n }}</span>
                  </a>
                   <a (click)="setView('search')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                    <i class="fas fa-search w-6"></i><span class="ml-3">{{ 'search' | i18n }}</span>
                  </a>
                } @else {
                  <a (click)="setView('admin')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                    <i class="fas fa-user-shield w-6"></i><span class="ml-3">{{ 'adminPanel' | i18n }}</span>
                  </a>
                }
              </nav>
              <div class="p-4 border-t dark:border-gray-700">
                <a (click)="setView('profile')" class="flex items-center p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                  <img [src]="user.avatar_url || 'https://i.pravatar.cc/40?u=' + user.id" alt="User Avatar" class="w-8 h-8 rounded-full mr-3">
                  <span class="font-semibold truncate">{{ user.name }}</span>
                </a>
                <a (click)="handleLogout()" class="flex items-center p-3 mt-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer">
                  <i class="fas fa-sign-out-alt w-6"></i><span class="ml-3">{{ 'logout' | i18n }}</span>
                </a>
              </div>
            </aside>
          }
        </div>
      }
    }
  }

  <!-- Modals -->
  @if (modal() !== 'none') {
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" (click)="closeModal()">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full m-4" (click)="$event.stopPropagation()">
        @switch(modal()) {
          @case('new-request') {
            @if(currentUser(); as user) {
              <app-service-request-form 
                [user]="user"
                (formSubmitted)="handleServiceRequestSubmit($event)" 
                (close)="closeModal()" />
            }
          }
          @case('chat') {
            @if(activeServiceRequest(); as request) {
              @if(currentUser(); as user) {
                <app-chat [serviceRequest]="request" [currentUser]="user" (close)="closeModal()" />
              }
            }
          }
          @case('scheduler') {
            @if(activeServiceRequest(); as request) {
              <app-scheduler 
                [serviceRequest]="request"
                (appointmentConfirmed)="handleAppointmentConfirmed($event)"
                (close)="closeModal()" />
            }
          }
        }
      </div>
    </div>
  }

  <!-- Notification Center -->
  @if (isNotificationsOpen()) {
    <div class="fixed inset-0 bg-black/30 z-50" (click)="isNotificationsOpen.set(false)"></div>
    <div class="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform"
         [class.translate-x-0]="isNotificationsOpen()"
         [class.translate-x-full]="!isNotificationsOpen()">
      <app-notification-center (close)="isNotificationsOpen.set(false)"></app-notification-center>
    </div>
  }
</div>
  `,
  styles: [`
    /* Add some basic transition styles for the sidebar and modals */
    aside, .fixed[class*="translate-x"] {
      transition: transform 0.3s ease-in-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notificationService = inject(NotificationService);
  private pushNotificationService = inject(PushNotificationService);

  // Main application state
  view = signal<View>('landing');
  modal = signal<Modal>('none');
  
  // Data signals
  currentUser = this.authService.appUser;
  
  // State for modals
  activeServiceRequest = signal<ServiceRequest | null>(null);
  
  // UI state
  isSidebarOpen = signal(false);
  isNotificationsOpen = signal(false);
  
  // For verification flow
  verificationEmail = signal('');

  hasUnreadNotifications = computed(() => 
    this.notificationService.notifications().some(n => !n.read)
  );

  isAuthView = computed(() => ['landing', 'login', 'register', 'verification'].includes(this.view()));
  authViewTheme = computed<'light' | 'dark'>(() => this.view() === 'landing' ? 'light' : 'dark');

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.dataService.loadInitialData(user);
        this.pushNotificationService.requestPermission();
        
        // Navigate based on user status and role
        if (user.status === 'Pending') {
          this.view.set('verification'); // Or a dedicated "pending approval" view
          this.verificationEmail.set(user.email); // Assume verification for professional
        } else if (user.role === 'admin') {
          this.view.set('admin');
        } else {
          this.view.set('dashboard');
        }
      } else {
        this.dataService.clearData();
        this.view.set('landing');
      }
    });
  }

  // --- Navigation and View Management ---
  
  setView(view: View) {
    this.view.set(view);
    this.isSidebarOpen.set(false);
  }

  openModal(modal: Modal, request?: ServiceRequest) {
    this.activeServiceRequest.set(request || null);
    this.modal.set(modal);
  }

  closeModal() {
    this.modal.set('none');
    this.activeServiceRequest.set(null);
  }

  // --- Event Handlers from Child Components ---
  
  handleLogin(payload: LoginPayload) {
    this.authService.login(payload.email, payload.password);
  }

  async handleForgotPassword(email: string) {
    await this.authService.resetPassword(email);
  }

  handleRegister(payload: RegisterPayload) {
    if (payload.role === 'client' || payload.role === 'professional') {
      this.authService.register(payload.name, payload.email, payload.password, payload.role);
      this.verificationEmail.set(payload.email);
      this.view.set('verification');
    } else {
      console.error(`An attempt was made to register with an invalid role: '${payload.role}'`);
      this.notificationService.addNotification('Registration failed: Invalid role selected.');
    }
  }
  
  handleVerification(code: string) {
    this.authService.verifyOtp(this.verificationEmail(), code);
  }

  handleServiceRequestSubmit(payload: any) {
    this.dataService.addServiceRequest(payload);
    this.closeModal();
  }
  
  handleAppointmentConfirmed(payload: { requestId: number, professionalId: number, date: Date }) {
    this.dataService.scheduleServiceRequest(payload.requestId, payload.professionalId, payload.date);
    this.closeModal();
  }

  handleLogout() {
    this.authService.logout();
    this.isSidebarOpen.set(false);
  }
}
