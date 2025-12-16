import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Guarda de Autenticação Geral
 * Valida se o usuário está autenticado antes de acessar a rota
 * 
 * Uso:
 * {
 *   path: 'protected-route',
 *   component: MyComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.appUser();
  
  console.log('[AuthGuard] Verificando autenticação:', {
    user: currentUser?.email,
    requestedUrl: state.url
  });
  
  // Se não há usuário autenticado, redirecionar para landing
  if (!currentUser) {
    console.warn('[AuthGuard] Usuário não autenticado. Redirecionando para login.');
    router.navigate(
      ['/'],
      { 
        queryParams: { returnUrl: state.url },
        state: { showLogin: true }
      }
    );
    return false;
  }
  
  // Verificar se email foi confirmado
  if (currentUser.status === 'Pending') {
    console.warn('[AuthGuard] Email não confirmado ainda.');
    router.navigate(['/'], { 
      queryParams: { showVerification: true } 
    });
    return false;
  }
  
  // Se status não é "Active", denegar acesso
  if (currentUser.status !== 'Active') {
    console.warn('[AuthGuard] Usuário não está ativo. Status:', currentUser.status);
    router.navigate(['/']);
    return false;
  }
  
  console.log('[AuthGuard] Acesso permitido para:', currentUser.email);
  return true;
};
