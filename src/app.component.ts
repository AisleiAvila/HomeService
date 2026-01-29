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
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

// Services
import { AuthService } from "./services/auth.service";
import { DataService } from "./services/data.service";
import { NotificationService } from "./services/notification.service";
import { InAppNotificationService } from "./services/in-app-notification.service";
import { WorkflowServiceSimplified } from "./services/workflow-simplified.service";
import { I18nService } from "./i18n.service";
import { PushNotificationService } from "./services/push-notification.service";
import { UiStateService } from "./services/ui-state.service";
import { ThemeService } from "./services/theme.service";
import { AlertService } from "./services/alert.service";

// Models
import {
  ServiceRequest,
} from "./models/maintenance.models";

// Components
import { ChatComponent } from "./components/chat/chat.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { DailyMileageComponent } from "./components/mileage/daily-mileage.component";
import { ForgotPasswordComponent } from "./components/forgot-password/forgot-password.component";
import { LandingComponent } from "./components/landing/landing.component";
import { LoginComponent, LoginPayload } from "./components/login/login.component";
import { NotificationsComponent } from "./components/notifications/notifications.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { RegisterComponent, RegisterPayload } from "./components/register/register.component";
import { ResetPasswordComponent } from "./components/reset-password/reset-password.component";
import { ScheduleComponent } from "./components/schedule/schedule.component";
import { SchedulerComponent } from "./components/scheduler/scheduler.component";

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
type Nav = "dashboard" | "schedule" | "profile" | "daily-mileage" | "details" | "create-service-request" | "admin-create-service-request" | "overview" | "requests" | "approvals" | "finances" | "clients" | "categories" | "extra-services";

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
    DailyMileageComponent,
    ScheduleComponent,

    ProfileComponent,
    ServiceRequestDetailsComponent,
    SchedulerComponent,
    ChatComponent,
    NotificationsComponent,
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
  readonly inAppNotificationService = inject(InAppNotificationService);
  readonly i18n = inject(I18nService);
  readonly themeService = inject(ThemeService);
  private readonly alertService = inject(AlertService);
  private readonly workflowService = inject(WorkflowServiceSimplified);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  // URL do logo com parâmetro para evitar cache
  logoUrl = `assets/logo-new.png?v=${Date.now()}`;

  // App State
  view = signal<View>("landing");
  currentNav = signal<Nav>("dashboard");
  isRouterOutletActivated = false;

  // Admin navigation views


  // Modal State
  isSidebarOpen = signal(false);
  isSidebarCollapsed = signal(false);
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

  hasUnreadNotifications = computed(() => this.inAppNotificationService.unreadCount() > 0);
  authTheme = computed(() => (this.view() === "landing" ? "light" : "dark"));
  isMobile = computed(() => {
    if (globalThis.window === undefined) return false;
    return globalThis.window.innerWidth < 768;
  });

  navItems = computed(() => {
    const currentUser = this.currentUser();
    const isAdmin = currentUser?.role === 'admin';
    
    const items: { id: Nav; labelKey: string; icon: string }[] = [];
    
    // Items for professionals
    if (!isAdmin) {
      items.push(
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
          id: "daily-mileage",
          labelKey: "dailyMileage",
          icon: "fa-solid fa-tachometer-alt",
        }
      );
    }
    
    // Admin items
    if (isAdmin) {
      items.push(
        {
          id: "overview",
          labelKey: "overview",
          icon: "fa-solid fa-tachometer-alt",
        },
        {
          id: "requests",
          labelKey: "requests",
          icon: "fa-solid fa-list",
        },
        {
          id: "approvals",
          labelKey: "approvals",
          icon: "fa-solid fa-user-check",
        },
        {
          id: "finances",
          labelKey: "finances",
          icon: "fa-solid fa-chart-line",
        },
        {
          id: "daily-mileage",
          labelKey: "dailyMileage",
          icon: "fa-solid fa-tachometer-alt",
        },
        {
          id: "clients",
          labelKey: "clients",
          icon: "fa-solid fa-user-friends",
        },
        {
          id: "categories",
          labelKey: "categories",
          icon: "fa-solid fa-tags",
        },
        {
          id: "extra-services",
          labelKey: "extraServices",
          icon: "fa-solid fa-square-plus",
        }
      );
    }
    
    // Profile item for everyone
    items.push({ id: 'profile', labelKey: 'profile', icon: 'fa-solid fa-user' });
    
    return items;
  });

  // Track last loaded user to prevent infinite loops
  private lastLoadedUserId: number | undefined = undefined;
  private lastAlertSyncUserId: number | undefined = undefined;

  // Persistência de navegação (profissional): permite dar refresh em "Detalhes" sem voltar para Visão Geral.
  private readonly pendingDetailsRequestId = signal<number | null>(null);

  constructor() {
    // Reidratar request id de detalhes a partir da URL (refresh/deep link)
    // (Usar window.location.search é mais confiável aqui do que router.url durante o bootstrap.)
    const qs = globalThis.window?.location?.search ?? '';
    const sp = new URLSearchParams(qs);
    const requestIdFromUrl = sp.get('requestId') ?? sp.get('sr');
    const parsedId = Number.parseInt(String(requestIdFromUrl ?? ''), 10);
    if (Number.isFinite(parsedId)) {
      this.pendingDetailsRequestId.set(parsedId);
    }

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
        this.lastAlertSyncUserId = undefined;
      } else if (user) {
        if (user.status === "Active") {
          this.view.set("app");

          // Importante: não forçar navegação a cada refresh.
          // Se o usuário der refresh numa rota profunda (ex: /admin/request-details/:id),
          // manter a URL atual para o Router reidratar a tela corretamente.
          const currentUrl = this.router.url || globalThis.window.location.pathname;

          this.ensureRoleRouteConsistency(user.role, currentUrl);

          // Default do nav interno (usado quando não há rota específica na URL)
          this.currentNav.set('dashboard');
          
          // Only load data if we haven't loaded it for this user yet
          if (this.lastLoadedUserId === user.id) {
            console.debug(`[AppComponent] Skipping data load - already loaded for user ${user.id}`);
          } else {
            console.log(`[AppComponent] Loading initial data for user ${user.id}`);
            this.dataService.loadInitialData();
            this.lastLoadedUserId = user.id;
            this.pushNotificationService.requestPermission();
            
            // Inicializar notificações in-app
            this.inAppNotificationService.subscribeToNotifications();
          }

          this.initializeAlertMonitoring(user);
        } else if (user.status === "Pending") {
          this.view.set("app");
        } else {
          this.authService.logout();
          this.lastLoadedUserId = undefined;
          this.lastAlertSyncUserId = undefined;
        }
      } else {
        this.view.set("landing");
        this.dataService.clearData();
        this.lastLoadedUserId = undefined;
        this.lastAlertSyncUserId = undefined;
      }
    });

    // Reidrata a tela de detalhes para profissional a partir do query param.
    // Observa serviceRequests() para funcionar mesmo se o refresh ocorrer antes do loadInitialData terminar.
    effect(() => {
      const user = this.currentUser();
      const requestId = this.pendingDetailsRequestId();
      const requests = this.dataService.serviceRequests();

      if (!user || user.role === 'admin') {
        return;
      }

      if (!requestId) {
        return;
      }

      // Se já está em detalhes com o mesmo request, não faz nada.
      const selected = this.selectedRequest();
      if (selected?.id === requestId && this.currentNav() === 'details') {
        return;
      }

      const found = requests.find((r) => r.id === requestId);
      if (found) {
        this.selectedRequest.set(found);
        this.currentNav.set('details');
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
    } else if (nav === 'profile') {
      // Profile is available for everyone
      this.router.navigate(['/']);
      this.currentNav.set(nav);
    } else if (user?.role === 'admin') {
      // Admin navigation
      console.log('[AppComponent] Navegação de admin para:', nav);
      this.router.navigate(['/admin', nav]);
    } else {
      // Professional navigation
      console.log('[AppComponent] Navegação de profissional para:', nav);
      this.router.navigate(['/']);
      this.currentNav.set(nav);
    }
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

  private isAdminAllowedOutsideAdminRoute(currentUrl: string): boolean {
    return (
      currentUrl === '/' ||
      currentUrl.startsWith('/?') ||
      currentUrl.startsWith('/create-service-request') ||
      currentUrl.startsWith('/admin-create-service-request') ||
      currentUrl.startsWith('/technical-reports/') ||
      currentUrl.startsWith('/requests/') ||
      currentUrl.startsWith('/confirmar-email') ||
      currentUrl.startsWith('/reset-password') ||
      currentUrl.startsWith('/design-system') ||
      currentUrl.startsWith('/ui-components')
    );
  }

  private ensureRoleRouteConsistency(role: string | undefined, currentUrl: string): void {
    if (role === 'admin') {
      // Admin deve usar /admin/* por padrão.
      // Se estiver na raiz (/), mandar para o painel admin para evitar cair no dashboard profissional (Overview vazio).
      if (currentUrl === '/' || currentUrl.startsWith('/?')) {
        console.log('[AppComponent] Admin na raiz, redirecionando para /admin');
        this.router.navigate(['/admin']);
        return;
      }

      // Admin deve permanecer em /admin/* (exceto rotas explícitas fora de /admin)
      if (!currentUrl.startsWith('/admin') && !this.isAdminAllowedOutsideAdminRoute(currentUrl)) {
        console.log('[AppComponent] Admin detectado, redirecionando para /admin');
        this.router.navigate(['/admin']);
      }
      return;
    }

    // Não-admin não deve permanecer em /admin/*.
    if (currentUrl.startsWith('/admin')) {
      console.log('[AppComponent] Usuário não-admin em rota /admin, redirecionando para /');
      this.router.navigate(['/']);
    }
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

  private initializeAlertMonitoring(user: { id?: number | null } | null): void {
    if (!user?.id) {
      return;
    }

    if (this.lastAlertSyncUserId === user.id) {
      return;
    }

    this.lastAlertSyncUserId = user.id;
    console.log(`[AppComponent] Iniciando sincronização de alertas para o usuário ${user.id}`);

    setTimeout(() => {
      this.alertService.checkOverdueRequests().catch((error) =>
        console.error("[AppComponent] Falha ao executar verificação de atrasos:", error)
      );
      this.alertService.sendDeadlineWarnings().catch((error) =>
        console.error("[AppComponent] Falha ao executar avisos de prazo:", error)
      );
    }, 0);
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

    // Persistir na URL para sobreviver a refresh (principalmente no mobile)
    if (this.currentUser()?.role !== 'admin') {
      this.pendingDetailsRequestId.set(request.id);
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { requestId: request.id },
        queryParamsHandling: 'merge',
      });
    }
  }
  goBackFromDetails() {
    this.selectedRequest.set(null);
    this.currentNav.set("dashboard");

    // Limpa a persistência da URL
    this.pendingDetailsRequestId.set(null);
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { requestId: null },
      queryParamsHandling: 'merge',
    });
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
    this.isSchedulerOpen.set(false);
    this.isClarificationModalOpen.set(false);
    this.uiState.closeChat();
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
    this.notificationService.showSuccess("Senha alterada com sucesso! Faça login com sua nova senha.");
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
