import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Auth } from '../services/auth';


export const adminGuard: CanMatchFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const { data } = await auth.getUser();
  if (!data.user) {
    return router.createUrlTree(['/auth/login']);
  }

  await auth.sincronizarPerfil();
  const role = auth.perfilActual()?.rol;
  return role === 'admin' ? true : router.createUrlTree(['/']);
};
