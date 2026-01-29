import { Route } from '@angular/router';
import { ExtraServicesPage } from './extra-services.page';

export const EXTRA_SERVICES_ROUTES: Route[] = [
  {
    path: '',
    component: ExtraServicesPage,
    title: 'Serviços Extras',
    data: { roles: ['admin'] },
  },
];
