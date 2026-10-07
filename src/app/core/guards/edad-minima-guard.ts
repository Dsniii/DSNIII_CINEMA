import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/auth';
import { ClienteSupabase } from '../services/supabase-client';

/** Calcula la edad en años a partir de una fecha `YYYY-MM-DD` (sin correrla por zona horaria). */
function calcularEdad(fechaNacimiento: string): number {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;

  // Aún no cumplió años este año.
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) {
    edad--;
  }
  return edad;
}

/** Obtiene la restricción de edad de la película, o null si no se pudo determinar. */
async function obtenerRestriccion(
  ruta: ActivatedRouteSnapshot,
  cliente: ClienteSupabase['cliente'],
): Promise<number | null> {
  let peliculaId = ruta.queryParamMap.get('pelicula');

  if (!peliculaId) {
    const funcionId = ruta.paramMap.get('funcionId');
    if (!funcionId) {
      return null;
    }
    // El parámetro puede ser el id de una función; si no existe, se toma como id de película.
    const { data: funcion } = await cliente
      .from('funciones')
      .select('pelicula_id')
      .eq('id', funcionId)
      .maybeSingle();
    peliculaId = funcion?.pelicula_id ?? funcionId;
  }

  const { data, error } = await cliente
    .from('peliculas')
    .select('restriccion_edad')
    .eq('id', peliculaId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  console.log('Restricción de edad de la película:', data.restriccion_edad);
  return Number(data.restriccion_edad ?? 0);
}

/**
 * Controla el acceso a la compra según la restricción de edad de la película:
 * sin restricción pasa cualquiera; con restricción exige sesión y edad suficiente.
 */
export const edadMinimaGuard: CanActivateFn = async (ruta) => {
  const autenticacion = inject(Autenticacion);
  const enrutador = inject(Router);
  const cliente = inject(ClienteSupabase).cliente;

  const restriccion = await obtenerRestriccion(ruta, cliente);

  if (restriccion === null) {
    return enrutador.createUrlTree(['/']);
  }
  if (restriccion <= 0) {
    return true;
  }

  const { data } = await autenticacion.obtenerUsuario();
  if (!data.user) {
    return enrutador.createUrlTree(['/auth/login']);
  }

  let fechaNacimiento: string = data.user.user_metadata?.['fecha_nacimiento'] ?? '';
  if (!fechaNacimiento) {
    const { data: perfil } = await cliente
      .from('perfiles')
      .select('fecha_nacimiento')
      .eq('id', data.user.id)
      .maybeSingle();
    fechaNacimiento = perfil?.fecha_nacimiento ?? '';
  }
  console.log('Fecha de nacimiento del usuario:', fechaNacimiento);
  if (!fechaNacimiento) {
    return enrutador.createUrlTree(['/perfil/datos']);
  }

  return calcularEdad(fechaNacimiento) >= restriccion ? true : enrutador.createUrlTree(['/']);
};