import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, TenantMenuItem } from '../../services/auth.service';
import { TenantContextService } from '../../services/tenant-context.service';

const ADMIN_MENU_CANDIDATES: TenantMenuItem[] = [
  'overview',
  'requests',
  'approvals',
  'finances',
  'stock-intake',
  'daily-mileage',
  'clients',
  'tenants',
  'categories',
  'extra-services',
];

const ADMIN_ROUTE_MAP: Partial<Record<TenantMenuItem, string>> = {
  overview: '/admin/overview',
  requests: '/admin/requests',
  approvals: '/admin/approvals',
  finances: '/admin/finances',
  'stock-intake': '/admin/stock-intake',
  'daily-mileage': '/admin/daily-mileage',
  clients: '/admin/clients',
  tenants: '/admin/tenants',
  categories: '/admin/categories',
  'extra-services': '/admin/extra-services',
};

const SECRETARY_MENU_CANDIDATES: TenantMenuItem[] = ['agenda', 'requests', 'stock-intake'];

function firstAdminEnabledRoute(authService: AuthService, role: 'admin' | 'super_user'): string | null {
  const enabled = authService.filterEnabledMenuItemsForRole(role, ADMIN_MENU_CANDIDATES);
  for (const item of enabled) {
    const route = ADMIN_ROUTE_MAP[item];
    if (route) {
      return route;
    }
  }

  return null;
}

function firstSecretaryEnabledRoute(authService: AuthService): string | null {
  const enabled = authService.filterEnabledMenuItemsForRole('secretario', SECRETARY_MENU_CANDIDATES);
  if (enabled.includes('agenda')) {
    return '/agenda';
  }
  if (enabled.includes('requests')) {
    return '/requests';
  }
  if (enabled.includes('stock-intake')) {
    return '/stock/intake';
  }

  return null;
}

function stockIntakeFallback(authService: AuthService): string {
  return authService.isMenuItemEnabledForCurrentUser('stock-intake') ? '/stock/intake' : '/';
}

function getFallbackUrlForRole(role: string | undefined, authService: AuthService): string {
  if (role === 'admin' || role === 'super_user') {
    return firstAdminEnabledRoute(authService, role) ?? '/';
  }

  if (role === 'secretario') {
    return firstSecretaryEnabledRoute(authService) ?? '/';
  }

  if (role === 'almoxarife') {
    return stockIntakeFallback(authService);
  }

  if (role === 'professional_almoxarife') {
    return stockIntakeFallback(authService);
  }

  return '/';
}

function roleSupportsTenantMenu(role: string | undefined): boolean {
  return role === 'admin'
    || role === 'super_user'
    || role === 'professional'
    || role === 'professional_almoxarife'
    || role === 'almoxarife'
    || role === 'secretario';
}

async function evaluateMenuFeatureAccess(feature: TenantMenuItem | undefined): Promise<boolean | UrlTree> {
  if (!feature) {
    return true;
  }

  const authService = inject(AuthService);
  const tenantContext = inject(TenantContextService);
  const router = inject(Router);
  const user = authService.appUser();

  if (!user) {
    return router.parseUrl('/');
  }

  if (!roleSupportsTenantMenu(user.role)) {
    return true;
  }

  const tenantIdFromContext = String(tenantContext.tenant()?.id || '').trim();
  const tenantIdFromUser = String(user.tenant_id || '').trim();
  const targetTenantId = user.role === 'super_user'
    ? tenantIdFromContext
    : (tenantIdFromContext || tenantIdFromUser);

  if (!targetTenantId) {
    return true;
  }

  if (authService.tenantMenuSettingsTenantId() !== targetTenantId) {
    await authService.loadTenantMenuSettings(targetTenantId);
  }

  if (!authService.isMenuItemEnabledForCurrentUser(feature)) {
    const fallbackUrl = getFallbackUrlForRole(user.role, authService);
    return router.parseUrl(fallbackUrl);
  }

  return true;
}

export const menuFeatureGuard: CanActivateFn = async (route) => {
  const feature = route.data?.['menuFeature'] as TenantMenuItem | undefined;
  return evaluateMenuFeatureAccess(feature);
};

export const menuFeatureChildGuard: CanActivateChildFn = async (route) => {
  const feature = route.data?.['menuFeature'] as TenantMenuItem | undefined;
  return evaluateMenuFeatureAccess(feature);
};
