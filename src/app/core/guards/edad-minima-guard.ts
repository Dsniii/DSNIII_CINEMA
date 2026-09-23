import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const edadMinimaGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const { data } = await auth.getUser();

  if (!data.user) {
    return router.createUrlTree(['/auth/login']);
  }

  const birthDate = data.user.user_metadata?.['fecha_nacimiento'] ?? '';

  if (!birthDate) {
    return router.createUrlTree(['/perfil/datos']);
  }

  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 18 ? true : router.createUrlTree(['/']);
};
