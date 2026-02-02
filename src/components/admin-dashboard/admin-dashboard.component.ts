

import { ChangeDetectionStrategy, Component, inject, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { I18nService } from "../../i18n.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [
    RouterModule
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

}

