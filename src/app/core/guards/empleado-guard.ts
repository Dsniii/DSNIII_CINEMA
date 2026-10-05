import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/auth';

/** Permite el paso solo al rol empleado; redirige al login o al inicio. */
export const empleadoGuard: CanActivateFn = async () => {
  const autenticacion = inject(Autenticacion);
  const enrutador = inject(Router);

  const { data } = await autenticacion.obtenerUsuario();
  if (!data.user) {
    return enrutador.createUrlTree(['/auth/login']);
  }

  await autenticacion.sincronizarPerfil();
  const rol = autenticacion.perfilActual()?.rol;
  return rol === 'empleado' ? true : enrutador.createUrlTree(['/']);
};
