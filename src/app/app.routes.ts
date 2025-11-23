
import { Routes } from '@angular/router';
import { CreateServiceRequestComponent } from './pages/create-service-request/create-service-request.component';
import { AdminCreateServiceRequestComponent } from './pages/admin-create-service-request/admin-create-service-request.component';
import { ConfirmEmailComponent } from '../components/confirm-email/confirm-email.component';
import { AdminDashboardComponent } from '../components/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  {
    path: 'create-service-request',
    component: CreateServiceRequestComponent,
  },
  {
    path: 'admin-create-service-request',
    component: AdminCreateServiceRequestComponent,
  },
  {
    path: 'auth/confirm',
    component: ConfirmEmailComponent,
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('../components/admin-dashboard/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent) },
      { path: 'requests', loadComponent: () => import('../components/admin-dashboard/service-requests/service-requests.component').then(m => m.ServiceRequestsComponent) },
      { path: 'approvals', loadComponent: () => import('../components/admin-dashboard/pending-approvals/pending-approvals.component').then(m => m.PendingApprovalsComponent) },
      { path: 'finances', loadComponent: () => import('../components/admin-dashboard/financial-reports/financial-reports.component').then(m => m.FinancialReportsComponent) },
      { path: 'professionals', loadComponent: () => import('../components/admin-dashboard/professionals-management/professionals-management.component').then(m => m.ProfessionalsManagementComponent) },
      { path: 'clients', loadComponent: () => import('../components/admin-dashboard/clients-management/clients-management.component').then(m => m.ClientsManagementComponent) },
      { path: 'categories', loadComponent: () => import('../components/category-management/category-management.component').then(m => m.CategoryManagementComponent) },
    ]
  },
];
