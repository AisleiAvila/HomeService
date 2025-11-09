import { Routes } from '@angular/router';
import { CreateServiceRequestComponent } from './pages/create-service-request/create-service-request.component';
import { AdminCreateServiceRequestComponent } from './pages/admin-create-service-request/admin-create-service-request.component';

export const routes: Routes = [
  {
    path: 'create-service-request',
    component: CreateServiceRequestComponent,
  },
  {
    path: 'admin-create-service-request',
    component: AdminCreateServiceRequestComponent,
  },
];
