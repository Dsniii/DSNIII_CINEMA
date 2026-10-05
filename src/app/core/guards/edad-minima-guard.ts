import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/auth';

/** Exige usuario con sesión y mayoría de edad (18 años) según su fecha de nacimiento. */
export const edadMinimaGuard: CanActivateFn = async () => {
  const autenticacion = inject(Autenticacion);
  const enrutador = inject(Router);

  const { data } = await autenticacion.obtenerUsuario();

  if (!data.user) {
    return enrutador.createUrlTree(['/auth/login']);
  }

  const fechaNacimiento = data.user.user_metadata?.['fecha_nacimiento'] ?? '';

  if (!fechaNacimiento) {
    return enrutador.createUrlTree(['/perfil/datos']);
  }

  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  // Aún no cumplió años este año.
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad >= 18 ? true : enrutador.createUrlTree(['/']);
};
