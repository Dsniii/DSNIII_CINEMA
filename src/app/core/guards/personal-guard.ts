import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Autenticacion } from '../services/auth';

/** Permite el paso a empleados y admin; redirige al login o al inicio. */
export const personalGuard: CanMatchFn = async () => {
  const autenticacion = inject(Autenticacion);
  const enrutador = inject(Router);

  const { data } = await autenticacion.obtenerUsuario();
  if (!data.user) {
    return enrutador.createUrlTree(['/auth/login']);
  }

  await autenticacion.sincronizarPerfil();
  const rol = autenticacion.perfilActual()?.rol;
  return rol === 'admin' || rol === 'empleado' ? true : enrutador.createUrlTree(['/']);
};