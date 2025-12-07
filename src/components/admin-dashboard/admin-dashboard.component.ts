
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterModule } from "@angular/router";
import { I18nService } from "../../i18n.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: "./admin-dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit() {
    // Verificação adicional de segurança
    const currentUser = this.authService.appUser();
    
    console.log('[AdminDashboard] Verificando usuário:', {
      email: currentUser?.email,
      role: currentUser?.role,
      status: currentUser?.status
    });
    
    if (!currentUser || currentUser.role !== 'admin' || currentUser.status !== 'Active') {
      console.warn('[AdminDashboard] Acesso negado. Redirecionando para home.');
      this.router.navigate(['/']);
    }
  }

  views = computed(() => [
    {
      id: "overview",
      path: "overview",
      label: this.i18n.translate("overview"),
      icon: "fas fa-tachometer-alt",
    },
    {
      id: "requests",
      path: "requests",
      label: this.i18n.translate("requests"),
      icon: "fas fa-list",
    },
    {
      id: "approvals",
      path: "approvals",
      label: this.i18n.translate("approvals"),
      icon: "fas fa-user-check",
    },
    {
      id: "finances",
      path: "finances",
      label: this.i18n.translate("finances"),
      icon: "fas fa-chart-line",
    },
    {
      id: "professionals",
      path: "professionals",
      label: this.i18n.translate("professionals"),
      icon: "fas fa-users",
    },
    {
      id: "clients",
      path: "clients",
      label: this.i18n.translate("clients"),
      icon: "fas fa-user-friends",
    },
    {
      id: "categories",
      path: "categories",
      label: this.i18n.translate("categories"),
      icon: "fas fa-tags",
    },
  ]);
}
