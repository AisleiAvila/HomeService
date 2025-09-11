import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  ViewChild,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";

// Services
import { AuthService } from "./services/auth.service";
import { DataService } from "./services/data.service";
import { NotificationService } from "./services/notification.service";
// FIX: Corrected import path for I18nService
import { I18nService } from "./i18n.service";
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
import { ModalComponent } from "./components/modal/modal.component";

// Pipes
import { I18nPipe } from "./pipes/i18n.pipe";

type View = "landing" | "login" | "register" | "verification" | "app";
type Nav = "dashboard" | "schedule" | "search" | "profile";

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
    ModalComponent,
  ],
  template: `
    <!-- CSS adicional para garantir responsividade -->
    <style>
      .mobile-safe {
        max-width: 100vw;
        overflow-x: hidden;
      }
    </style>

    <!-- Main view router -->
    @switch (view()) { @case ('landing') {
    <div class="relative w-full h-full mobile-safe">
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
        #loginComponent
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
      (backToLanding)="handleBackToLanding()"
    />
    } @case ('app') { @if (currentUser(); as user) {
    <div
      class="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden mobile-safe"
    >
      <!-- Mobile Overlay -->
      @if (isMobile() && isSidebarOpen()) {
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
        (click)="isSidebarOpen.set(false)"
      ></div>
      }

      <!-- Sidebar -->
      <aside
        [class]="
          'bg-gray-800 text-white flex flex-col transition-all duration-300 ease-in-out z-50 ' +
          (isMobile()
            ? isSidebarOpen()
              ? 'fixed inset-y-0 left-0 w-64 transform translate-x-0'
              : 'fixed inset-y-0 left-0 w-64 transform -translate-x-full'
            : isSidebarOpen()
            ? 'flex-shrink-0 w-64'
            : 'flex-shrink-0 w-16')
        "
      >
        <div
          class="h-16 flex items-center text-xl md:text-2xl font-bold flex-shrink-0 px-4 transition-all duration-300"
          [class.justify-center]="!isSidebarOpen()"
          [class.justify-start]="isSidebarOpen()"
        >
          <i
            class="fas fa-tools text-indigo-400"
            [class.mr-3]="isSidebarOpen()"
          ></i>
          @if (isSidebarOpen()) {
          <span class="truncate">{{ "appName" | i18n }}</span>
          }
        </div>

        <nav class="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          @for (item of navItems(); track item.id) {
          <a
            (click)="navigate(item.id)"
            class="flex items-center text-sm md:text-base rounded-lg cursor-pointer transition-colors min-h-[48px]"
            [class.bg-gray-700]="currentNav() === item.id"
            [class.hover:bg-gray-700]="currentNav() !== item.id"
            [class.px-4]="isSidebarOpen()"
            [class.py-3]="isSidebarOpen()"
            [class.px-3]="!isSidebarOpen()"
            [class.py-3]="!isSidebarOpen()"
            [class.justify-start]="isSidebarOpen()"
            [class.justify-center]="!isSidebarOpen()"
          >
            <i class="w-6 text-center text-lg" [class]="item.icon"></i>
            @if (isSidebarOpen()) {
            <span class="ml-3 truncate">{{ item.labelKey | i18n }}</span>
            }
          </a>
          } @if(user.role === 'client' && isSidebarOpen()) {
          <div class="px-4 pt-6">
            <button
              (click)="openNewRequestForm()"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center min-h-[48px]"
            >
              <i class="fas fa-plus mr-2 text-lg"></i>
              <span>{{ "newRequest" | i18n }}</span>
            </button>
          </div>
          } @if(user.role === 'client' && !isSidebarOpen()) {
          <div class="px-2 pt-6">
            <button
              (click)="openNewRequestForm()"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-2 rounded-lg transition-colors duration-200 flex items-center justify-center min-h-[48px]"
              title="{{ 'newRequest' | i18n }}"
            >
              <i class="fas fa-plus text-lg"></i>
            </button>
          </div>
          }
        </nav>

        <div class="border-t border-gray-700 p-4">
          @if (isSidebarOpen()) {
          <div class="flex items-center mb-4">
            <img
              [src]="user.avatar_url || 'https://i.pravatar.cc/40'"
              alt="User Avatar"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div class="ml-3 truncate">
              <p class="text-sm font-semibold">{{ user.name }}</p>
              <p class="text-xs text-gray-400">{{ user.role | i18n }}</p>
            </div>
          </div>
          <button
            (click)="handleLogout()"
            class="w-full text-left flex items-center px-4 py-3 text-sm rounded-lg hover:bg-gray-700 transition-colors min-h-[48px] cursor-pointer relative z-10"
          >
            <i class="fas fa-sign-out-alt w-6 text-center text-lg"></i>
            <span class="ml-3">{{ "logout" | i18n }}</span>
          </button>
          } @else {
          <div class="flex flex-col items-center space-y-3">
            <img
              [src]="user.avatar_url || 'https://i.pravatar.cc/40'"
              alt="User Avatar"
              class="w-10 h-10 rounded-full object-cover"
            />
            <button
              (click)="handleLogout()"
              class="p-3 text-sm rounded-lg hover:bg-gray-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer relative z-10"
              title="{{ 'logout' | i18n }}"
            >
              <i class="fas fa-sign-out-alt text-lg"></i>
            </button>
          </div>
          }
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          class="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-10 flex-shrink-0 min-h-[60px]"
        >
          <!-- Left Section: Menu + Title -->
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <!-- Mobile Menu Button -->
            <button
              (click)="isSidebarOpen.set(!isSidebarOpen())"
              class="text-gray-700 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-md transition-colors duration-200 flex-shrink-0 md:hidden"
              aria-label="Menu"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>

            <!-- Desktop Toggle Button -->
            <button
              (click)="isSidebarOpen.set(!isSidebarOpen())"
              class="text-gray-700 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-md transition-colors duration-200 flex-shrink-0 hidden md:block"
              aria-label="Toggle sidebar"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>

            <!-- Page Title (visible on mobile too but smaller) -->
            <h1 class="text-lg md:text-xl font-semibold text-gray-700 truncate">
              {{ currentNav() | i18n }}
            </h1>
          </div>

          <!-- Right Section: Controls -->
          <div class="flex items-center space-x-2 flex-shrink-0">
            <app-language-switcher theme="light" />
            <button
              (click)="isNotificationCenterOpen.set(true)"
              class="relative text-gray-700 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notificações"
            >
              <i class="fas fa-bell text-lg"></i>
              @if (hasUnreadNotifications()) {
              <span
                class="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
              ></span>
              }
            </button>
            <!-- Mobile Logout Button -->
            <button
              (click)="handleLogout()"
              class="md:hidden text-gray-700 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="{{ 'logout' | i18n }}"
              title="{{ 'logout' | i18n }}"
            >
              <i class="fas fa-sign-out-alt text-lg"></i>
            </button>
          </div>
        </header>

        <main
          class="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6 bg-gray-100 min-w-0"
        >
          @switch(currentNav()) { @case('dashboard') { @if(user.role ===
          'admin') {
          <app-admin-dashboard />
          } @else {
          <app-dashboard
            [user]="user"
            (viewDetails)="openDetails($event)"
            (openChat)="openChat($event)"
            (payNow)="handlePayment($event)"
            (scheduleRequest)="openScheduler($event)"
          />
          } } @case('schedule') {
          <app-schedule [user]="user" (viewDetails)="openDetails($event)" />
          } @case('search') {
          <app-search [user]="user" />
          } @case('profile') {
          <app-profile [user]="user" />
          } }
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
      <p>{{ "loadingUser" | i18n }}</p>
    </div>
    } } }

    <!-- Modal de Sucesso do Registro -->
    <app-modal
      [title]="'registrationSuccessful' | i18n"
      [message]="'emailVerificationRequired' | i18n"
      [isVisible]="showRegistrationModal()"
      (closed)="handleModalClose()"
    />
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
export class AppComponent implements OnInit {
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
  isSidebarOpen = signal(false); // Inicialmente fechado para mobile
  isNotificationCenterOpen = signal(false);
  isChatOpen = signal(false);
  isNewRequestFormOpen = signal(false);
  isSchedulerOpen = signal(false);
  isDetailsModalOpen = signal(false);
  showRegistrationModal = signal(false);

  selectedRequest = signal<ServiceRequest | null>(null);

  // User data
  currentUser = this.authService.appUser;
  pendingEmailConfirmation = this.authService.pendingEmailConfirmation;
  emailForVerification = signal("");

  // Component References
  @ViewChild(LoginComponent) loginComponent?: LoginComponent;

  hasUnreadNotifications = computed(() =>
    this.notificationService.notifications().some((n) => !n.read)
  );

  authTheme = computed(() => (this.view() === "landing" ? "light" : "dark"));

  // Detecção de mobile baseada na largura da tela
  isMobile = computed(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768; // md breakpoint do Tailwind
  });

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
    return items;
  });

  constructor() {
    // Listen for messages from admin dashboard
    window.addEventListener("message", (event) => {
      if (event.data?.type === "OPEN_REQUEST_DETAILS" && event.data?.payload) {
        console.log(
          "Admin Dashboard message received - opening details:",
          event.data.payload
        );
        this.openDetails(event.data.payload);
      } else if (event.data?.type === "OPEN_CHAT" && event.data?.payload) {
        console.log(
          "Admin Dashboard message received - opening chat:",
          event.data.payload
        );
        this.openChat(event.data.payload);
      }
    });

    effect(() => {
      const user = this.currentUser();
      const pendingEmail = this.pendingEmailConfirmation();

      console.log("🎯 AppComponent effect triggered:");
      console.log("  - currentUser:", user?.id || "null");
      console.log("  - pendingEmailConfirmation:", pendingEmail || "null");

      if (pendingEmail) {
        // Usuário registrado mas precisa confirmar e-mail
        console.log("📧 Redirecionando para tela de verificação");
        this.emailForVerification.set(pendingEmail);
        this.view.set("verification");
        this.dataService.clearData();
      } else if (user) {
        console.log("👤 Usuário autenticado, status:", user.status);
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
        console.log("🏠 Redirecionando para landing");
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
    // Fechar sidebar apenas no mobile após navegação
    if (this.isMobile()) {
      this.isSidebarOpen.set(false);
    }
  }

  // --- Auth Handlers ---
  async handleLogin(payload: LoginPayload) {
    console.log(
      "handleLogin - Logging in with",
      payload.email,
      payload.password
    );

    try {
      const response = await this.authService.login(
        payload.email,
        payload.password
      );

      if (response.error) {
        console.log("❌ Erro no login:", response.error.message);

        // Exibir erro no componente de login
        if (this.loginComponent) {
          this.loginComponent.setError(response.error.message);
        }

        // Usuário permanece na tela de login
      } else {
        console.log("✅ Login bem-sucedido");

        // Limpar erros do componente de login
        if (this.loginComponent) {
          this.loginComponent.clearError();
        }

        // O AuthService vai automaticamente definir o currentUser
        // e o effect vai redirecionar para a aplicação
      }
    } catch (error) {
      console.error("❌ Erro inesperado no login:", error);

      if (this.loginComponent) {
        this.loginComponent.setError("Erro inesperado. Tente novamente.");
      }
    }
  }

  handleRegister(payload: RegisterPayload) {
    console.log(
      "🎯 AppComponent.handleRegister() chamado para:",
      payload.email
    );

    this.authService.register(
      payload.name,
      payload.email,
      payload.password,
      payload.role
    );

    console.log("✅ AuthService.register() chamado");

    // Mostrar modal de sucesso
    console.log("📱 Exibindo modal de sucesso do registro");
    this.showRegistrationModal.set(true);
  }

  handleVerification(code: string) {
    this.authService
      .verifyOtp(this.emailForVerification(), code)
      .then((response) => {
        if (response.error) {
          // Erro na verificação será tratado pelo AuthService
          return;
        }

        this.notificationService.addNotification(
          "Verification successful! You can now access the application."
        );

        // Limpar estado de verificação pendente
        this.authService.pendingEmailConfirmation.set(null);

        // O effect do constructor vai automaticamente redirecionar para a aplicação
      });
  }

  handleResendVerification() {
    const email = this.emailForVerification();
    if (email) {
      // Usar o método signInWithOtp para reenviar código
      this.authService.resendVerificationCode(email);
    }
  }

  handleBackToLanding() {
    console.log("🏠 Usuário solicitou volta para tela principal");
    // Limpar e-mail pendente de confirmação
    this.authService.pendingEmailConfirmation.set(null);
    this.emailForVerification.set("");
    // Redirecionar para landing
    this.view.set("landing");
  }

  handleForgotPassword(email: string) {
    this.authService.resetPassword(email);
  }

  async handleLogout() {
    console.log("🚪 Logout button clicked - iniciando logout");
    try {
      await this.authService.logout();
      console.log("🔄 Logout concluído, redirecionando para landing");

      // Forçar redirecionamento para landing page
      this.view.set("landing");
      this.isSidebarOpen.set(false);

      // Limpar todos os modais abertos
      this.isNewRequestFormOpen.set(false);
      this.selectedRequest.set(null);
      this.isChatOpen.set(false);
      this.isNotificationCenterOpen.set(false);
    } catch (error) {
      console.error("❌ Erro durante logout, mas continuando:", error);

      // Mesmo com erro, redirecionar para landing
      this.view.set("landing");
      this.isSidebarOpen.set(false);

      // Forçar limpeza do estado local
      this.authService.appUser.set(null);
    }
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
    console.log("openDetails called with request:", request);
    this.selectedRequest.set(request);
    this.isDetailsModalOpen.set(true);
    console.log("Modal state:", this.isDetailsModalOpen());
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

  handleModalClose() {
    console.log("🏠 Modal fechado, retornando para tela principal");
    this.showRegistrationModal.set(false);
    this.view.set("landing");
  }

  ngOnInit() {
    // Inicializar estado do sidebar baseado no dispositivo
    if (typeof window !== "undefined") {
      this.isSidebarOpen.set(window.innerWidth >= 768);

      // Listener para mudanças na largura da tela
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) {
          this.isSidebarOpen.set(true);
        } else {
          this.isSidebarOpen.set(false);
        }
      });
    }
  }
}
