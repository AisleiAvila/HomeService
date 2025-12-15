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
import { WorkflowServiceSimplified } from "./services/workflow-simplified.service";
import { I18nService } from "./i18n.service";
import { PushNotificationService } from "./services/push-notification.service";
import { UiStateService } from "./services/ui-state.service";
import { ThemeService } from "./services/theme.service";

// Models
import {
  ServiceRequest,
} from "./models/maintenance.models";

// Components
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
import { NotificationToastComponent } from "./components/notification-toast/notification-toast.component";
import { ThemeToggleComponent } from "./components/theme-toggle/theme-toggle.component";
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
    DashboardComponent,
    ScheduleComponent,
    SearchComponent,
    ProfileComponent,
    ServiceRequestDetailsComponent,
    SchedulerComponent,
    ChatComponent,
    NotificationCenterComponent,
    LanguageSwitcherComponent,
    NotificationToastComponent,
    ThemeToggleComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  // Spinner global para transições (ex: login ou dashboard loading)
  private readonly _isAppLoading = signal(false);
  // Computed: mostra spinner se login ou dashboard/data está carregando
  isAppLoading = computed(() => this._isAppLoading() || this.dataService.isLoading());
  // Services
  readonly authService = inject(AuthService);
  readonly dataService = inject(DataService);
  readonly notificationService = inject(NotificationService);
  readonly i18n = inject(I18nService);
  readonly themeService = inject(ThemeService);
  private readonly workflowService = inject(WorkflowServiceSimplified);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);

  // App State
  view = signal<View>("landing");
  currentNav = signal<Nav>("dashboard");
  isRouterOutletActivated = false;

  // Admin navigation views


  // Modal State
  isSidebarOpen = signal(false);
  isSidebarCollapsed = signal(false);
  isNotificationCenterOpen = signal(false);
  showRegistrationModal = signal(false);
  isClarificationModalOpen = signal(false);
  showDirectAssignmentModal = signal(false);
  isSchedulerOpen = signal(false);

  // UI State Service (chat)
  readonly uiState = inject(UiStateService);
  isChatOpen = this.uiState.isChatOpen;
  selectedRequest = this.uiState.selectedRequest;

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
      { id: 'profile', labelKey: 'profile', icon: 'fa-solid fa-user' },
    ];
    // REMOVIDO: Cliente não é mais um papel válido no sistema
    // Apenas admin e profissional podem acessar a aplicação
    return items;
  });

  // Track last loaded user to prevent infinite loops
  private lastLoadedUserId: number | undefined = undefined;

  constructor() {
    // Detecta link de confirmação de e-mail e redireciona para redefinição de senha
    const urlParams = new URLSearchParams(globalThis.window.location.search);
    const token = urlParams.get('token') || urlParams.get('access_token');
    const email = urlParams.get('email');
    if (token && email) {
      this.emailForPasswordReset.set(email);
      this.view.set('reset-password');
    }

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
        this.lastLoadedUserId = undefined;
      } else if (user) {
        if (user.status === "Active") {
          this.view.set("app");
          
          // Redirecionar admin para /admin após login
          if (user.role === 'admin') {
            console.log('[AppComponent] Admin detectado, redirecionando para /admin');
            this.router.navigate(['/admin']);
            this.currentNav.set('dashboard');
          } else {
            // Garantir que não-admin está na rota raiz
            console.log('[AppComponent] Usuário não-admin, garantindo rota raiz');
            this.router.navigate(['/']);
            this.currentNav.set('dashboard');
          }
          
          // Only load data if we haven't loaded it for this user yet
          if (this.lastLoadedUserId === user.id) {
            console.debug(`[AppComponent] Skipping data load - already loaded for user ${user.id}`);
          } else {
            console.log(`[AppComponent] Loading initial data for user ${user.id}`);
            this.dataService.loadInitialData();
            this.lastLoadedUserId = user.id;
            this.pushNotificationService.requestPermission();
          }
        } else if (user.status === "Pending") {
          this.view.set("app");
        } else {
          this.authService.logout();
          this.lastLoadedUserId = undefined;
        }
      } else {
        this.view.set("landing");
        this.dataService.clearData();
        this.lastLoadedUserId = undefined;
      }
    });
  }

  onActivate(event: any) {
    this.isRouterOutletActivated = true;
  }

  onDeactivate(event: any) {
    this.isRouterOutletActivated = false;
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
    const user = this.currentUser();
    console.log('[AppComponent] Navigate chamado:', {
      nav,
      userRole: user?.role,
      userEmail: user?.email
    });
    
    if (nav === 'create-service-request') {
      this.router.navigate(['/create-service-request']);
    } else if (nav === 'admin-create-service-request') {
      this.router.navigate(['/admin-create-service-request']);
    } else if (nav === 'dashboard' && user?.role === 'admin') {
      console.log('[AppComponent] Redirecionando admin para /admin');
      this.router.navigate(['/admin']);
      this.currentNav.set(nav);
    } else if (nav === 'dashboard' && user?.role !== 'admin') {
      console.log('[AppComponent] Navegando usuário não-admin para dashboard normal');
      this.router.navigate(['/']);
      this.currentNav.set(nav);
    } else {
      this.router.navigate(['/']);
      this.currentNav.set(nav);
    }
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

  async handleLogin(payload: LoginPayload) {
    this._isAppLoading.set(true);
    try {
      const user = await this.authService.loginCustom(payload.email, payload.password);
      if (!user) {
        this.setLoginError('Credenciais inválidas ou erro de autenticação.');
        this._isAppLoading.set(false);
        return;
      }
      this.clearLoginError();
      // O spinner será desativado após o dashboard carregar (ver effect abaixo)
    } catch (error) {
      this.handleLoginError(error);
      this._isAppLoading.set(false);
    }
  }
  // Desativa o spinner global após o dashboard estar pronto
  private readonly dashboardLoaded = false;

  private setLoginError(message: string) {
    if (this.loginComponent) {
      this.loginComponent.setError(message);
    }
    this.notificationService.addNotification(message);
  }

  private clearLoginError() {
    if (this.loginComponent) {
      this.loginComponent.clearError();
    }
  }

  private async checkTemporaryPassword(payload: LoginPayload) {
    const supabaseUrl = (globalThis as any).env?.SUPABASE_REST_URL
      || (globalThis as any).SUPABASE_REST_URL
      || (globalThis as any).environment?.supabaseRestUrl
      || (globalThis as any).environment?.SUPABASE_REST_URL
      || (globalThis as any).SUPABASE_URL
      || (globalThis as any).VITE_SUPABASE_REST_URL
      || '';
    const supabaseKey = (globalThis as any).env?.SUPABASE_ANON_KEY
      || (globalThis as any).SUPABASE_ANON_KEY
      || (globalThis as any).environment?.supabaseAnonKey
      || (globalThis as any).environment?.SUPABASE_ANON_KEY
      || (globalThis as any).SUPABASE_KEY
      || (globalThis as any).VITE_SUPABASE_ANON_KEY
      || '';
    const userRes = await fetch(
      `${supabaseUrl}/users?select=password,email&email=eq.${payload.email}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'accept-profile': 'public'
        }
      }
    );
    if (!userRes.ok) return;
    const userArr = await userRes.json();
    if (!Array.isArray(userArr) || userArr.length === 0) return;
    const user = userArr[0];
    if (user.password && payload.password === user.password) {
      this.emailForPasswordReset.set(payload.email);
      this.view.set('reset-password');
      this.notificationService.addNotification('Por favor, defina uma nova senha para continuar.');
    }
  }

  private handleLoginError(error: unknown) {
    console.error('Error during login:', error);
    const errorMessage = error instanceof Error ? error.message : this.i18n.translate('login_error');
    this.setLoginError(errorMessage);
  }

  async handleRegister(payload: RegisterPayload) {
    console.log("🎯 AppComponent.handleRegister() chamado com payload:", payload);
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

  handleLogout() {
    try {
      this.authService.logout();
      this.currentUser.set(null);
      this.dataService.clearData();
      this.view.set("landing");
      this.isSidebarOpen.set(false);
      this.isNotificationCenterOpen.set(false);
      this.isSchedulerOpen.set(false);
      this.isClarificationModalOpen.set(false);
      this.selectedRequest.set(null);
      this.currentNav.set("dashboard");
      this.notificationService.addNotification(this.i18n.translate('logout_success'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : this.i18n.translate('logout_error');
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

  openNewRequestForm() {
    this.router.navigate(['/create-service-request']);
    this.isSidebarOpen.set(false);
  }

  openChat(request: ServiceRequest) {
    this.uiState.openChat(request);
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
    this.isSchedulerOpen.set(false);
    this.isClarificationModalOpen.set(false);
    this.uiState.closeChat();
  }

  async handleApproveQuote(request: ServiceRequest) {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;

    // Se é profissional aceitando a atribuição
    if (currentUser.role === "professional" && request.professional_id === currentUser.id) {
      await this.workflowService.respondToAssignment(
        request.id,
        currentUser.id,
        true // accept = true
      );
    } else {
      // Fallback para admin ou outros casos
      await this.dataService.updateServiceRequest(request.id, {
        status: "Aceito",
      });
      this.notificationService.addNotification(
        `Quote for "${request.title}" approved`
      );
    }
    this.closeModal();
  }

  async handleRejectQuote(request: ServiceRequest) {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;

    // Se é profissional recusando a atribuição
    if (currentUser.role === "professional" && request.professional_id === currentUser.id) {
      await this.workflowService.respondToAssignment(
        request.id,
        currentUser.id,
        false, // accept = false
        "Orçamento rejeitado pelo profissional"
      );
    } else {
      // Cancelar para admin ou outros casos
      await this.workflowService.cancelRequest(
        request.id,
        currentUser.id,
        `Quote for "${request.title}" rejected`
      );
    }
    this.closeModal();
  }

  handlePayment(request: ServiceRequest) {
    this.dataService
      .updatePaymentStatus(request.id, "Paid")
      .then(async () => {
        this.notificationService.addNotification(
          `Payment for request #${request.id} processed.`
        );
        await this.dataService.loadInitialData();
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
      this.dataService.loadInitialData();
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
