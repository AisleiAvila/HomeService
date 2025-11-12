import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  ViewChild,
} from "@angular/core";
import { Router, RouterModule } from "@angular/router";

// Services
import { AuthService } from "./services/auth.service";
import { DataService } from "./services/data.service";
import { NotificationService } from "./services/notification.service";
import { I18nService } from "./i18n.service";
import { PushNotificationService } from "./services/push-notification.service";

// Models
import {
  ServiceRequest,
} from "./models/maintenance.models";

// Components
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { ChatComponent } from "./components/chat/chat.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { ForgotPasswordComponent } from "./components/forgot-password/forgot-password.component";
import { LandingComponent } from "./components/landing/landing.component";
import { LoginComponent, LoginPayload } from "./components/login/login.component";
import { NotificationCenterComponent } from "./components/notification-center/notification-center.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { RegisterComponent, RegisterPayload } from "./components/register/register.component";
import { ResetPasswordComponent } from "./components/reset-password/reset-password.component";
import { ScheduleComponent } from "./components/schedule/schedule.component";
import { SchedulerComponent } from "./components/scheduler/scheduler.component";
import { SearchComponent } from "./components/search/search.component";
import { ServiceRequestDetailsComponent } from "./components/service-request-details/service-request-details.component";
import { VerificationComponent } from "./components/verification/verification.component";
import { LanguageSwitcherComponent } from "./components/language-switcher/language-switcher.component";
import { I18nPipe } from "./pipes/i18n.pipe";

type View =
  | "landing"
  | "login"
  | "register"
  | "verification"
  | "forgot-password"
  | "reset-password"
  | "app";
type Nav = "dashboard" | "schedule" | "search" | "profile" | "details" | "create-service-request" | "admin-create-service-request";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    I18nPipe,
    RouterModule,
    LandingComponent,
    LoginComponent,
    RegisterComponent,
    VerificationComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    AdminDashboardComponent,
    DashboardComponent,
    ScheduleComponent,
    SearchComponent,
    ProfileComponent,
    ServiceRequestDetailsComponent,
    SchedulerComponent,
    ChatComponent,
    NotificationCenterComponent,
    LanguageSwitcherComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  // Services
  readonly authService = inject(AuthService);
  readonly dataService = inject(DataService);
  readonly notificationService = inject(NotificationService);
  readonly i18n = inject(I18nService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);

  // App State
  view = signal<View>("landing");
  currentNav = signal<Nav>("dashboard");
  isRouterOutletActivated = false;
  
  // Admin navigation views
  adminViews = computed(() => [
    {
      id: "overview" as const,
      label: this.i18n.translate("overview"),
      icon: "fas fa-tachometer-alt",
    },
    {
      id: "requests" as const,
      label: this.i18n.translate("requests"),
      icon: "fas fa-list",
    },
    {
      id: "approvals" as const,
      label: this.i18n.translate("approvals"),
      icon: "fas fa-user-check",
    },
    {
      id: "finances" as const,
      label: this.i18n.translate("finances"),
      icon: "fas fa-chart-line",
    },
    {
      id: "professionals" as const,
      label: this.i18n.translate("professionals"),
      icon: "fas fa-users",
    },
    {
      id: "clients" as const,
      label: this.i18n.translate("clients"),
      icon: "fas fa-user-friends",
    },
    {
      id: "categories" as const,
      label: this.i18n.translate("categories"),
      icon: "fas fa-tags",
    },
  ]);
  
  currentAdminView = signal<'overview' | 'requests' | 'approvals' | 'finances' | 'professionals' | 'clients' | 'categories'>('overview');

  // Modal State
  isSidebarOpen = signal(false);
  isSidebarCollapsed = signal(false);
  isNotificationCenterOpen = signal(false);
  isChatOpen = signal(false);
  isSchedulerOpen = signal(false);
  showRegistrationModal = signal(false);
  isClarificationModalOpen = signal(false);

  selectedRequest = signal<ServiceRequest | null>(null);

  // User data
  currentUser = this.authService.appUser;
  pendingEmailConfirmation = this.authService.pendingEmailConfirmation;
  emailForVerification = signal("");
  emailForPasswordReset = signal("");

  // Component References
  @ViewChild(LoginComponent) loginComponent?: LoginComponent;

  hasUnreadNotifications = computed(() =>
    this.notificationService.notifications().some((n) => !n.read)
  );
  authTheme = computed(() => (this.view() === "landing" ? "light" : "dark"));
  isMobile = computed(() => {
    if (globalThis.window === undefined) return false;
    return globalThis.window.innerWidth < 768;
  });

  navItems = computed(() => {
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
    if (this.currentUser()?.role === 'client') {
      items.push({ id: 'create-service-request', labelKey: 'newServiceRequest', icon: 'fa-solid fa-plus' });
    }
    return items;
  });

  constructor() {
    globalThis.window.addEventListener("message", (event) => {
      if (event.origin !== globalThis.window.location.origin) {
        return;
      }
      
      if (event.data?.type === "OPEN_REQUEST_DETAILS" && event.data?.payload) {
        this.openDetails(event.data.payload);
      } else if (event.data?.type === "OPEN_CHAT" && event.data?.payload) {
        this.openChat(event.data.payload);
      }
    });

    effect(() => {
      const user = this.currentUser();
      const pendingEmail = this.pendingEmailConfirmation();

      if (pendingEmail) {
        this.emailForVerification.set(pendingEmail);
        this.view.set("verification");
        this.dataService.clearData();
      } else if (user) {
        if (user.status === "Active") {
          this.view.set("app");
          this.dataService.loadInitialData(user);
          this.pushNotificationService.requestPermission();
        } else if (user.status === "Pending") {
          this.view.set("app");
        } else {
          this.authService.logout();
        }
      } else {
        this.view.set("landing");
        this.dataService.clearData();
      }
    });
  }

  onActivate(event: any) {
    this.isRouterOutletActivated = true;
  }

  onDeactivate(event: any) {
    this.isRouterOutletActivated = false;
  }
  
  setAdminView(viewId: 'overview' | 'requests' | 'approvals' | 'finances' | 'professionals' | 'clients' | 'categories') {
    this.currentAdminView.set(viewId);
    // Ensure we're on the dashboard nav
    if (this.currentNav() !== 'dashboard') {
      this.navigate('dashboard');
    }
  }

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
    if (nav === 'create-service-request') {
      this.router.navigate(['/create-service-request']);
    } else if (nav === 'admin-create-service-request') {
      this.router.navigate(['/admin-create-service-request']);
    } else {
      this.router.navigate(['/']);
      this.currentNav.set(nav);
    }
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

  async handleLogin(payload: LoginPayload) {
    try {
      const response = await this.authService.login(
        payload.email,
        payload.password
      );
      if (response.error) {
        if (this.loginComponent)
          this.loginComponent.setError(response.error.message);
      } else if (this.loginComponent) {
        this.loginComponent.clearError();
      }
    } catch (error) {
      console.error('Error during login:', error);
      const errorMessage = error instanceof Error ? error.message : this.i18n.translate('login_error');
      if (this.loginComponent) {
        this.loginComponent.setError(errorMessage);
      }
      this.notificationService.addNotification(errorMessage);
    }
  }

  async handleRegister(payload: RegisterPayload) {
    console.log("🎯 AppComponent.handleRegister() chamado com payload:", {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      passwordLength: payload.password.length,
    });
    
    try {
      console.log("📞 Chamando authService.register()...");
      await this.authService.register(
        payload.name,
        payload.email,
        payload.password,
        payload.role
      );
      console.log("✅ authService.register() concluído sem erros");
      // Só mostra o modal se o registro foi bem-sucedido
      // A verificação de pendingEmailConfirmation já redireciona para tela de verificação
    } catch (error) {
      console.error('❌ Erro durante o registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar cadastro';
      this.notificationService.addNotification(errorMessage);
    }
  }

  handleVerification(code: string) {
    this.authService
      .verifyOtp(this.emailForVerification(), code)
      .then((response) => {
        if (response.error) return;
        this.notificationService.addNotification(
          "Verification successful! You can now access the application."
        );
        this.authService.pendingEmailConfirmation.set(null);
      });
  }

  handleResendVerification() {
    const email = this.emailForVerification();
    if (email) this.authService.resendVerificationCode(email);
  }

  handleBackToLanding() {
    this.authService.pendingEmailConfirmation.set(null);
    this.emailForVerification.set("");
    this.view.set("landing");
  }

  handleForgotPassword(email: string) {
    this.emailForPasswordReset.set(email);
    this.view.set("forgot-password");
  }

  handleForgotPasswordCodeRequested(email: string) {
    this.emailForPasswordReset.set(email);
    this.view.set("reset-password");
  }

  handlePasswordResetComplete() {
    this.emailForPasswordReset.set("");
    this.view.set("login");
    this.notificationService.addNotification(
      this.i18n.translate("password_reset_success")
    );
  }

  async handleLogout() {
    try {
      await this.authService.logout();
      this.view.set("landing");
      this.isSidebarOpen.set(false);
      this.selectedRequest.set(null);
      this.isChatOpen.set(false);
      this.isNotificationCenterOpen.set(false);
    } catch (error) {
      console.error('Error during logout:', error);
      const errorMessage = error instanceof Error ? error.message : this.i18n.translate('logout_error');
      this.notificationService.addNotification(errorMessage);
      this.view.set("landing");
      this.isSidebarOpen.set(false);
      this.authService.appUser.set(null);
    }
  }

  openNewRequestForm() {
    this.router.navigate(['/create-service-request']);
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
    this.currentNav.set("details");
  }
  goBackFromDetails() {
    this.selectedRequest.set(null);
    this.currentNav.set("dashboard");
  }
  openClarificationModal(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.isClarificationModalOpen.set(true);
  }

  toggleSidebar() {
    if (this.isMobile()) {
      this.isSidebarOpen.set(!this.isSidebarOpen());
    } else {
      this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
    }
  }
  openNotificationCenter() {
    this.isNotificationCenterOpen.set(true);
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

  closeModal() {
    this.isNotificationCenterOpen.set(false);
    this.isChatOpen.set(false);
    this.isSchedulerOpen.set(false);
    this.isClarificationModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  handleApproveQuote(request: ServiceRequest) {
    this.dataService.updateServiceRequest(request.id, {
      status: "Aprovado",
    });
    this.notificationService.addNotification(
      `Quote for "${request.title}" approved`
    );
    this.closeModal();
  }

  handleRejectQuote(request: ServiceRequest) {
    this.dataService.updateServiceRequest(request.id, { status: "Cancelado" });
    this.notificationService.addNotification(
      `Quote for "${request.title}" rejected`
    );
    this.closeModal();
  }

  handlePayment(request: ServiceRequest) {
    this.dataService
      .updatePaymentStatus(request.id, "Paid")
      .then(async () => {
        this.notificationService.addNotification(
          `Payment for request #${request.id} processed.`
        );
        await this.dataService.loadInitialData(this.currentUser());
        this.closeModal();
      })
      .catch((error) => {
        this.notificationService.addNotification(
          `Erro ao processar pagamento: ${error.message}`
        );
      });
  }

  handleModalClose() {
    this.showRegistrationModal.set(false);
    this.view.set("landing");
  }

  handleRefreshRequest() {
    const user = this.currentUser();
    if (user) {
      this.dataService.loadInitialData(user);
    }
  }

  ngOnInit() {
    if (globalThis.window !== undefined) {
      this.isSidebarOpen.set(globalThis.window.innerWidth >= 768);
      globalThis.window.addEventListener("resize", () => {
        if (globalThis.window.innerWidth >= 768) this.isSidebarOpen.set(true);
        else this.isSidebarOpen.set(false);
      });
    }
  }
}
