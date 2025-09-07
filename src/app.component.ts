import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";

// Services
import { AuthService } from "./services/auth.service";
import { DataService } from "./services/data.service";
import { NotificationService } from "./services/notification.service";
// FIX: Corrected import path for I18nService
import { I18nService } from "./services/i18n.service";
import { PushNotificationService } from "./services/push-notification.service";

// Models
import { User, ServiceRequest } from "./models/maintenance.models";
import { ServiceRequestPayload } from "./models/maintenance.models";
import { LoginPayload } from "./components/login/login.component";
import { RegisterPayload } from "./components/register/register.component";

// Components
import { LandingComponent } from "./components/landing/landing.component";
import { LoginComponent } from "./components/login/login.component";
import { RegisterComponent } from "./components/register/register.component";
import { VerificationComponent } from "./components/verification/verification.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { ScheduleComponent } from "./components/schedule/schedule.component";
import { SearchComponent } from "./components/search/search.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { ServiceRequestFormComponent } from "./components/service-request-form/service-request-form.component";
import { ServiceRequestDetailsComponent } from "./components/service-request-details/service-request-details.component";
import { SchedulerComponent } from "./components/scheduler/scheduler.component";
import { ChatComponent } from "./components/chat/chat.component";
import { NotificationCenterComponent } from "./components/notification-center/notification-center.component";
import { LanguageSwitcherComponent } from "./components/language-switcher/language-switcher.component";

// Pipes
import { I18nPipe } from "./pipes/i18n.pipe";

type View = "landing" | "login" | "register" | "verification" | "app";
type Nav = "dashboard" | "schedule" | "search" | "profile" | "admin";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    I18nPipe,
    LandingComponent,
    LoginComponent,
    RegisterComponent,
    VerificationComponent,
    DashboardComponent,
    ScheduleComponent,
    SearchComponent,
    ProfileComponent,
    AdminDashboardComponent,
    ServiceRequestFormComponent,
    ServiceRequestDetailsComponent,
    SchedulerComponent,
    ChatComponent,
    NotificationCenterComponent,
    LanguageSwitcherComponent,
  ],
  template: `
    <!-- Main view router -->
    @switch (view()) { @case ('landing') {
    <div class="relative w-full h-full">
      <div class="absolute top-4 right-4 z-10">
        <app-language-switcher [theme]="authTheme()" />
      </div>
      <app-landing (signIn)="showLogin()" (createAccount)="showRegister()" />
    </div>
    } @case ('login') {
    <div class="relative w-full h-full">
      <div class="absolute top-4 right-4 z-10">
        <app-language-switcher [theme]="authTheme()" />
      </div>
      <app-login
        (loggedIn)="handleLogin($event)"
        (switchToRegister)="showRegister()"
        (switchToLanding)="showLanding()"
        (forgotPassword)="handleForgotPassword($event)"
      />
    </div>
    } @case ('register') {
    <div class="relative w-full h-full">
      <div class="absolute top-4 right-4 z-10">
        <app-language-switcher [theme]="authTheme()" />
      </div>
      <app-register
        (registered)="handleRegister($event)"
        (switchToLogin)="showLogin()"
        (switchToLanding)="showLanding()"
      />
    </div>
    } @case ('verification') {
    <app-verification
      [email]="emailForVerification()"
      (verified)="handleVerification($event)"
      (resendCode)="handleResendVerification()"
    />
    } @case ('app') { @if (currentUser(); as user) {
    <div class="flex h-screen bg-gray-100 font-sans text-gray-800">
      <!-- Sidebar -->
      <aside
        class="bg-gray-800 text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-20"
        [class.w-64]="isSidebarOpen()"
        [class.w-0]="!isSidebarOpen()"
        [class.md:w-64]="true"
      >
        <div
          class="h-16 flex items-center justify-center text-2xl font-bold flex-shrink-0 px-4"
        >
          <i class="fas fa-tools mr-3 text-indigo-400"></i>
          <span class="truncate">MaintainApp</span>
        </div>

        <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          @for (item of navItems(); track item.id) {
          <a
            (click)="navigate(item.id)"
            class="flex items-center px-4 py-2 text-sm rounded-md cursor-pointer transition-colors"
            [class.bg-gray-700]="currentNav() === item.id"
            [class.hover:bg-gray-700]="currentNav() !== item.id"
          >
            <i class="w-6 text-center" [class]="item.icon"></i>
            <span class="ml-3 truncate">{{ item.labelKey | i18n }}</span>
          </a>
          } @if(user.role === 'client') {
          <div class="px-4 pt-4">
            <button
              (click)="openNewRequestForm()"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <i class="fas fa-plus mr-2"></i>
              <span>New Request</span>
            </button>
          </div>
          }
        </nav>

        <div class="p-4 border-t border-gray-700">
          <div class="flex items-center">
            <img
              [src]="user.avatar_url || 'https://i.pravatar.cc/40'"
              alt="User Avatar"
              class="w-10 h-10 rounded-full object-cover"
            />
            <div class="ml-3 truncate">
              <p class="text-sm font-semibold">{{ user.name }}</p>
              <p class="text-xs text-gray-400">{{ user.role | i18n }}</p>
            </div>
          </div>
          <button
            (click)="handleLogout()"
            class="w-full mt-4 text-left flex items-center px-4 py-2 text-sm rounded-md hover:bg-gray-700"
          >
            <i class="fas fa-sign-out-alt w-6 text-center"></i>
            <span class="ml-3">{{ "logout" | i18n }}</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <header
          class="bg-white shadow-sm p-4 flex justify-between items-center z-10 flex-shrink-0"
        >
          <button
            (click)="isSidebarOpen.set(!isSidebarOpen())"
            class="text-gray-600 md:hidden"
          >
            <i class="fas fa-bars text-xl"></i>
          </button>
          <h1 class="text-xl font-semibold text-gray-700 hidden md:block">
            {{ currentNav() | i18n }}
          </h1>
          <div class="flex items-center space-x-4">
            <app-language-switcher theme="light" />
            <button
              (click)="isNotificationCenterOpen.set(true)"
              class="relative text-gray-600 hover:text-indigo-600"
            >
              <i class="fas fa-bell text-xl"></i>
              @if (hasUnreadNotifications()) {
              <span
                class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              ></span>
              }
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
          @switch(currentNav()) { @case('dashboard') {
          <app-dashboard
            [user]="user"
            (viewDetails)="openDetails($event)"
            (openChat)="openChat($event)"
            (payNow)="handlePayment($event)"
            (scheduleRequest)="openScheduler($event)"
          />
          } @case('schedule') {
          <app-schedule [user]="user" (viewDetails)="openDetails($event)" />
          } @case('search') {
          <app-search [user]="user" />
          } @case('profile') {
          <app-profile [user]="user" />
          } @case('admin') { @if(user.role === 'admin') {
          <app-admin-dashboard />
          } } }
        </main>
      </div>
    </div>

    <!-- Modals Layer -->
    @if (isNewRequestFormOpen()) {
    <div class="modal-backdrop" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <app-service-request-form
          [user]="user"
          (close)="closeModal()"
          (formSubmitted)="handleFormSubmitted($event)"
        />
      </div>
    </div>
    } @if (isNotificationCenterOpen()) {
    <div class="modal-backdrop-right" (click)="closeModal()">
      <app-notification-center
        (close)="closeModal()"
        (click)="$event.stopPropagation()"
      />
    </div>
    } @if (isChatOpen() && selectedRequest()) {
    <div class="modal-backdrop" (click)="closeModal()">
      <div
        class="modal-content max-w-2xl h-3/4"
        (click)="$event.stopPropagation()"
      >
        <app-chat
          [currentUser]="user"
          [serviceRequest]="selectedRequest()!"
          (close)="closeModal()"
        />
      </div>
    </div>
    } @if (isSchedulerOpen() && selectedRequest()) {
    <div class="modal-backdrop" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <app-scheduler
          [serviceRequest]="selectedRequest()!"
          (close)="closeModal()"
          (appointmentConfirmed)="handleScheduleConfirmed($event)"
        />
      </div>
    </div>
    } @if (isDetailsModalOpen() && selectedRequest()) {
    <div class="modal-backdrop" (click)="closeModal()">
      <div class="modal-content max-w-4xl" (click)="$event.stopPropagation()">
        <app-service-request-details
          [request]="selectedRequest()!"
          [currentUser]="user"
          (close)="closeModal()"
          (openChat)="openChat($event)"
          (approveQuote)="handleApproveQuote($event)"
          (rejectQuote)="handleRejectQuote($event)"
          (scheduleRequest)="openScheduler($event)"
          (payNow)="handlePayment($event)"
        />
      </div>
    </div>
    } } @else {
    <div class="w-screen h-screen flex items-center justify-center">
      <p>Loading user...</p>
    </div>
    } } }
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
          "Segoe UI Symbol";
      }
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
      }

      .modal-content {
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideInUp 0.3s ease-out;
      }

      .modal-backdrop-right {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
      }

      /* Ensure child component fills the modal content area */
      .modal-content > *:first-child {
        height: 100%;
        width: 100%;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideInUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Services
  authService = inject(AuthService);
  dataService = inject(DataService);
  notificationService = inject(NotificationService);
  i18n = inject(I18nService);
  private pushNotificationService = inject(PushNotificationService);

  // App State
  view = signal<View>("landing");
  currentNav = signal<Nav>("dashboard");

  // Modal State
  isSidebarOpen = signal(false);
  isNotificationCenterOpen = signal(false);
  isChatOpen = signal(false);
  isNewRequestFormOpen = signal(false);
  isSchedulerOpen = signal(false);
  isDetailsModalOpen = signal(false);

  selectedRequest = signal<ServiceRequest | null>(null);

  // User data
  currentUser = this.authService.appUser;
  emailForVerification = signal("");

  hasUnreadNotifications = computed(() =>
    this.notificationService.notifications().some((n) => !n.read)
  );

  authTheme = computed(() => (this.view() === "landing" ? "light" : "dark"));

  navItems = computed(() => {
    const userRole = this.currentUser()?.role;
    const items: { id: Nav; labelKey: string; icon: string }[] = [
      {
        id: "dashboard",
        labelKey: "dashboard",
        icon: "fa-solid fa-table-columns",
      },
      {
        id: "schedule",
        labelKey: "schedule",
        icon: "fa-solid fa-calendar-days",
      },
      {
        id: "search",
        labelKey: "search",
        icon: "fa-solid fa-magnifying-glass",
      },
      { id: "profile", labelKey: "profile", icon: "fa-solid fa-user" },
    ];
    if (userRole === "admin") {
      items.push({
        id: "admin",
        labelKey: "admin",
        icon: "fa-solid fa-user-shield",
      });
    }
    return items;
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        if (user.status === "Active") {
          this.view.set("app");
          this.dataService.loadInitialData(user);
          this.pushNotificationService.requestPermission();
        } else if (user.status === "Pending") {
          // Professionals start as pending. They can log in but will see a limited view.
          this.view.set("app");
        } else {
          // Rejected or other status
          this.authService.logout();
        }
      } else {
        this.view.set("landing");
        this.dataService.clearData();
      }
    });
  }

  // --- View Navigation ---
  showLogin() {
    this.view.set("login");
  }
  showRegister() {
    this.view.set("register");
  }
  showLanding() {
    this.view.set("landing");
  }
  navigate(nav: Nav) {
    this.currentNav.set(nav);
    this.isSidebarOpen.set(false);
  }

  // --- Auth Handlers ---
  handleLogin(payload: LoginPayload) {
    console.log(
      "handleLogin - Logging in with",
      payload.email,
      payload.password
    );
    this.authService.login(payload.email, payload.password);
  }

  handleRegister(payload: RegisterPayload) {
    this.authService.register(
      payload.name,
      payload.email,
      payload.password,
      payload.role
    );
    this.emailForVerification.set(payload.email);
    this.view.set("verification");
  }

  handleVerification(code: string) {
    this.authService.verifyOtp(this.emailForVerification(), code).then(() => {
      this.notificationService.addNotification(
        "Verification successful! You can now log in."
      );
      this.view.set("login");
    });
  }

  handleResendVerification() {
    this.notificationService.addNotification(
      "A new verification code has been sent."
    );
    // In a real app, you would call an authService method here.
  }

  handleForgotPassword(email: string) {
    this.authService.resetPassword(email);
  }

  handleLogout() {
    this.authService.logout();
    this.isSidebarOpen.set(false);
  }

  // --- Modal & Action Handlers ---
  openNewRequestForm() {
    this.isNewRequestFormOpen.set(true);
    this.isSidebarOpen.set(false);
  }

  openChat(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.isChatOpen.set(true);
  }

  openScheduler(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.isSchedulerOpen.set(true);
  }

  openDetails(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.isDetailsModalOpen.set(true);
  }

  handleScheduleConfirmed(event: {
    requestId: number;
    professionalId: number;
    date: Date;
  }) {
    this.dataService.scheduleServiceRequest(
      event.requestId,
      event.professionalId,
      event.date
    );
    this.closeModal();
  }

  async handleFormSubmitted(payload: ServiceRequestPayload) {
    try {
      // Add immediate feedback
      this.notificationService.addNotification("Creating service request...");

      await this.dataService.addServiceRequest(payload);

      // Success - close modal
      this.isNewRequestFormOpen.set(false);
    } catch (error) {
      // Error handling - keep modal open
      console.error("Error creating service request:", error);
      // Error notification already handled by DataService
    }
  }

  closeModal() {
    this.isNewRequestFormOpen.set(false);
    this.isNotificationCenterOpen.set(false);
    this.isChatOpen.set(false);
    this.isSchedulerOpen.set(false);
    this.isDetailsModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  handleApproveQuote(request: ServiceRequest) {
    this.dataService.updateServiceRequest(request.id, { status: "Approved" });
    this.notificationService.addNotification(
      `Quote for "${request.title}" approved`
    );
    this.closeModal();
  }

  handleRejectQuote(request: ServiceRequest) {
    this.dataService.updateServiceRequest(request.id, { status: "Cancelled" });
    this.notificationService.addNotification(
      `Quote for "${request.title}" rejected`
    );
    this.closeModal();
  }

  handlePayment(request: ServiceRequest) {
    // In a real app, this would integrate with a payment provider.
    this.dataService.updatePaymentStatus(request.id, "Paid");
    this.notificationService.addNotification(
      `Payment for request #${request.id} processed.`
    );
    this.closeModal();
  }
}
