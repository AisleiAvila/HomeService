
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { Router, RouterModule, RouterLink, RouterLinkActive } from "@angular/router";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";

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
export class AdminDashboardComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

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
