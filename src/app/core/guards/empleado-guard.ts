import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const empleadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const { data } = await auth.getUser();
  if (!data.user) {
    return router.createUrlTree(['/auth/login']);
  }

  await auth.sincronizarPerfil();
  const role = auth.perfilActual()?.rol;
  return role === 'empleado' ? true : router.createUrlTree(['/']);
};
