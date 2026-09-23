import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

const normalizeRole = (value: unknown): string => String(value ?? '').toLowerCase();

export const empleadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const { data } = await auth.getUser();
  const role = normalizeRole(
    data.user?.app_metadata?.['role'] ?? data.user?.app_metadata?.['rol'] ?? data.user?.user_metadata?.['role'] ?? data.user?.user_metadata?.['rol'],
  );

  if (!data.user) {
    return router.createUrlTree(['/auth/login']);
  }

  const allowedRoles = ['empleado', 'employee', 'admin', 'administrador'];

  return allowedRoles.includes(role) ? true : router.createUrlTree(['/']);
};
