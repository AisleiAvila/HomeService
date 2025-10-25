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

// Services
import { AuthService } from "./services/auth.service";
import { DataService } from "./services/data.service";
import { NotificationService } from "./services/notification.service";
import { I18nService } from "./i18n.service";
import { PushNotificationService } from "./services/push-notification.service";

// Models
import { LoginPayload } from "./components/login/login.component";
import { RegisterPayload } from "./components/register/register.component";
import {
  ServiceRequest,
  ServiceRequestPayload,
} from "./models/maintenance.models";

// Components
import { ChatComponent } from "./components/chat/chat.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { ForgotPasswordComponent } from "./components/forgot-password/forgot-password.component";
import { LandingComponent } from "./components/landing/landing.component";
import { LoginComponent } from "./components/login/login.component";
import { NotificationCenterComponent } from "./components/notification-center/notification-center.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { RegisterComponent } from "./components/register/register.component";
import { ResetPasswordComponent } from "./components/reset-password/reset-password.component";
import { ScheduleComponent } from "./components/schedule/schedule.component";
import { SchedulerComponent } from "./components/scheduler/scheduler.component";
import { SearchComponent } from "./components/search/search.component";
import { ServiceRequestDetailsComponent } from "./components/service-request-details/service-request-details.component";
import { ServiceRequestFormComponent } from "./components/service-request-form/service-request-form.component";
import { VerificationComponent } from "./components/verification/verification.component";
import { LanguageSwitcherComponent } from "./components/language-switcher/language-switcher.component";
import { I18nPipe } from "./pipes/i18n.pipe";

// Pipes (none used directly in this component)

type View =
  | "landing"
  | "login"
  | "register"
  | "verification"
  | "forgot-password"
  | "reset-password"
  | "app";
type Nav = "dashboard" | "schedule" | "search" | "profile" | "details";

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
    ForgotPasswordComponent,
    ResetPasswordComponent,
    DashboardComponent,
    ScheduleComponent,
    SearchComponent,
    ProfileComponent,
    ServiceRequestFormComponent,
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
  // Colapso apenas para desktop (md+)
  isSidebarCollapsed = signal(false);
  isNotificationCenterOpen = signal(false);
  isChatOpen = signal(false);
  isNewRequestFormOpen = signal(false);
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
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
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
    return items;
  });

  constructor() {
    window.addEventListener("message", (event) => {
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
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

  // --- Auth Handlers ---
  async handleLogin(payload: LoginPayload) {
    try {
      const response = await this.authService.login(
        payload.email,
        payload.password
      );
      if (response.error) {
        if (this.loginComponent)
          this.loginComponent.setError(response.error.message);
      } else {
        if (this.loginComponent) this.loginComponent.clearError();
      }
    } catch (error) {
      // noop
    }
  }

  handleRegister(payload: RegisterPayload) {
    this.authService.register(
      payload.name,
      payload.email,
      payload.password,
      payload.role
    );
    this.showRegistrationModal.set(true);
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
      this.isNewRequestFormOpen.set(false);
      this.selectedRequest.set(null);
      this.isChatOpen.set(false);
      this.isNotificationCenterOpen.set(false);
    } catch (error) {
      this.view.set("landing");
      this.isSidebarOpen.set(false);
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

  // --- UI helpers ---
  toggleSidebar() {
    // Em mobile abre/fecha o off-canvas; em desktop colapsa/expande a sidebar
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

  async handleFormSubmitted(payload: ServiceRequestPayload) {
    try {
      this.notificationService.addNotification("Creating service request...");
      await this.dataService.addServiceRequest(payload);
      this.isNewRequestFormOpen.set(false);
    } catch (error) {
      console.error("Error creating service request:", error);
    }
  }

  closeModal() {
    this.isNewRequestFormOpen.set(false);
    this.isNotificationCenterOpen.set(false);
    this.isChatOpen.set(false);
    this.isSchedulerOpen.set(false);
    this.isClarificationModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  handleApproveQuote(request: ServiceRequest) {
    this.dataService.updateServiceRequest(request.id, {
      status: "Aprovado pelo cliente",
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

  // Usado por app-service-request-details (evento refreshRequest)
  handleRefreshRequest() {
    const user = this.currentUser();
    if (user) {
      this.dataService.loadInitialData(user);
    }
  }

  ngOnInit() {
    if (typeof window !== "undefined") {
      this.isSidebarOpen.set(window.innerWidth >= 768);
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) this.isSidebarOpen.set(true);
        else this.isSidebarOpen.set(false);
      });
    }
  }
}
