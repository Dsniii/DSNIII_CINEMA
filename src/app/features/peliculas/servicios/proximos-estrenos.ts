import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { PeliculaProxima } from '../models/pelicula';

/** Fecha de hoy en hora local como `YYYY-MM-DD` (toISOString usaría UTC y correría el día). */
function hoyLocal(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Lectura de las películas que todavía no se estrenaron. */
@Injectable({ providedIn: 'root' })
export class ProximosEstrenos {
  private readonly supabase = inject(ClienteSupabase);

  /** Películas con fecha de estreno posterior a hoy, de la más cercana a la más lejana. */
  async listar(): Promise<PeliculaProxima[]> {
    // Misma línea que usás en perfiles.ts para obtener el cliente de Supabase.
    const cliente = this.supabase.cliente;

    const { data, error } = await cliente
      .from('peliculas')
      .select('nombre, imagen_path, fecha_estreno, dias_preventa')
      .gt('fecha_estreno', hoyLocal())
      .order('fecha_estreno', { ascending: true });
    if (error) {
      throw error;
    }

    return (data ?? []) as PeliculaProxima[];
  }
}