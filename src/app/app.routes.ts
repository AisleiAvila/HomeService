
import { Routes } from '@angular/router';
import { CreateServiceRequestComponent } from './pages/create-service-request/create-service-request.component';
import { AdminCreateServiceRequestComponent } from './pages/admin-create-service-request/admin-create-service-request.component';
import { EmailConfirmationComponent } from './components/email-confirmation.component';
import { AdminDashboardComponent } from '../components/admin-dashboard/admin-dashboard.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { UiComponentsShowcaseComponent } from '../components/ui/ui-components-showcase.component';
import { DesignSystemShowcaseComponent } from '../components/design-system-showcase.component';
export const routes: Routes = [
  {
    path: 'technical-reports/:id/sign',
    loadComponent: () => import('./pages/technical-report-sign/technical-report-sign.component').then(m => m.TechnicalReportSignComponent),
  },
  {
    path: 'confirmar-email',
    component: EmailConfirmationComponent,
  },
  {
    path: 'reset-password',
    loadComponent: () => import('../components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'ui-components',
    component: UiComponentsShowcaseComponent,
    data: { title: 'Componentes de UI' }
  },
  {
    path: 'design-system',
    component: DesignSystemShowcaseComponent,
    data: { title: 'Design System' }
  },
  {
    path: 'create-service-request',
    component: CreateServiceRequestComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin-create-service-request',
    component: AdminCreateServiceRequestComponent,
    canActivate: [authGuard],
  },
  {
    path: 'requests/:id/geolocation',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/service-request-geolocation/service-request-geolocation.component').then(
        (m) => m.ServiceRequestGeolocationComponent
      ),
  },
  // (Removido rota antiga de confirmação)
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('../components/admin-dashboard/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent) },
      { path: 'requests', loadComponent: () => import('../components/admin-dashboard/service-requests/service-requests.component').then(m => m.ServiceRequestsComponent) },
      { path: 'requests/:id/geolocation', loadComponent: () => import('./pages/service-request-geolocation/service-request-geolocation.component').then(m => m.ServiceRequestGeolocationComponent) },
      { path: 'request-details/:id', loadComponent: () => import('../components/service-request-details/service-request-details.component').then(m => m.ServiceRequestDetailsComponent) },
      { path: 'service-request-edit/:id', loadComponent: () => import('../components/service-request-edit/service-request-edit.component').then(m => m.ServiceRequestEditComponent) },
      { path: 'approvals', loadComponent: () => import('../components/admin-dashboard/pending-approvals/pending-approvals.component').then(m => m.PendingApprovalsComponent) },
      { path: 'finances', loadComponent: () => import('../components/admin-dashboard/financial-reports/financial-reports.component').then(m => m.FinancialReportsComponent) },
      { path: 'daily-mileage', loadComponent: () => import('../components/mileage/daily-mileage.component').then(m => m.DailyMileageComponent) },
      { path: 'stock-intake', loadComponent: () => import('../components/admin-dashboard/stock-intake/stock-intake.component').then(m => m.StockIntakeComponent) },
      { path: 'clients', loadComponent: () => import('../components/admin-dashboard/users-management/users-management.component').then(m => m.UsersManagementComponent) },
      { path: 'categories', loadComponent: () => import('../components/category-management/category-management.component').then(m => m.CategoryManagementComponent) },
      { path: 'extra-services',
        loadChildren: () => import('./pages/extra-services/extra-services.page.routes').then(m => m.EXTRA_SERVICES_ROUTES),
        data: { title: 'Serviços Extras', roles: ['admin'] }
      },
    ]
  },
];
