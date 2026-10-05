import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/auth';

/** Permite el paso solo si hay sesión activa; si no, redirige al login. */
export const authGuard: CanActivateFn = async () => {
  const autenticacion = inject(Autenticacion);
  const enrutador = inject(Router);

  const { data } = await autenticacion.obtenerSesion();

  if (!data.session) {
    return enrutador.createUrlTree(['/auth/login']);
  }

  return true;
};
