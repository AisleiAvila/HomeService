import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.appUser();
  
  console.log('[AdminGuard] Verificando acesso ao admin:', {
    user: currentUser?.email,
    role: currentUser?.role,
    status: currentUser?.status
  });
  
  // Verifica se o usuário está autenticado
  if (!currentUser) {
    console.warn('[AdminGuard] Usuário não autenticado. Redirecionando para landing.');
    router.navigate(['/']);
    return false;
  }
  
  // Verifica se o usuário tem role de admin
  if (currentUser.role !== 'admin') {
    console.warn('[AdminGuard] Usuário não é admin. Role:', currentUser.role, '. Redirecionando para dashboard.');
    router.navigate(['/']);
    return false;
  }
  
  // Verifica se o usuário está ativo
  if (currentUser.status !== 'Active') {
    console.warn('[AdminGuard] Usuário admin não está ativo. Status:', currentUser.status);
    router.navigate(['/']);
    return false;
  }
  
  console.log('[AdminGuard] Acesso permitido ao admin.');
  return true;
};
