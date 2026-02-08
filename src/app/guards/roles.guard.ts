import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/maintenance.models";

type AllowedRole = UserRole;

export const rolesGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.appUser();
  const allowedRoles = (route.data?.["roles"] as AllowedRole[] | undefined) ?? [];

  console.log("[RolesGuard] Verificando roles:", {
    requestedUrl: state.url,
    user: currentUser?.email,
    role: currentUser?.role,
    allowedRoles,
  });

  // Se não tem roles definidas, não bloqueia
  if (allowedRoles.length === 0) {
    return true;
  }

  // Deixar authGuard lidar com login/estado; mas por segurança, negar se não autenticado
  if (!currentUser) {
    router.navigate(["/"]);
    return false;
  }

  const userRole = currentUser.role as AllowedRole;
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  console.warn("[RolesGuard] Acesso negado.", {
    requestedUrl: state.url,
    role: currentUser.role,
    allowedRoles,
  });

  router.navigate(["/"]);
  return false;
};
