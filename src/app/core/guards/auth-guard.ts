import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const { data } = await auth.getSession();

  if (!data.session) {
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
