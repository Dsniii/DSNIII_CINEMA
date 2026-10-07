import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Genero, PeliculaGenero } from '../models/genero';
import { PeliculaCartelera } from '../models/pelicula';

/** Lecturas de la pantalla "Cartelera" (home). */
@Injectable({ providedIn: 'root' })
export class Cartelera {
  private readonly supabase = inject(ClienteSupabase);

  /** Películas activas. El componente decide cuáles ya se pueden comprar (estrenadas o en preventa). */
  async listarActivas(): Promise<PeliculaCartelera[]> {
    // Misma línea que usás en perfiles.ts para obtener el cliente de Supabase.
    const cliente = this.supabase.cliente;

    const { data, error } = await cliente
      .from('peliculas')
      .select('id, nombre, imagen_path, restriccion_edad, fecha_estreno, dias_preventa')
      .eq('activa', true)
      .order('fecha_estreno', { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []) as PeliculaCartelera[];
  }

  /**
   * Géneros y su relación con las películas.
   * SUPUESTO: tablas `generos (id, nombre)` y `peliculas_generos (pelicula_id, genero_id)`.
   */
  async listarGeneros(): Promise<{ generos: Genero[]; relaciones: PeliculaGenero[] }> {
    const cliente = this.supabase.cliente;

    const [generos, relaciones] = await Promise.all([
      cliente.from('generos').select('id, nombre').order('nombre', { ascending: true }),
      cliente.from('peliculas_generos').select('pelicula_id, genero_id'),
    ]);
    if (generos.error) {
      throw generos.error;
    }
    if (relaciones.error) {
      throw relaciones.error;
    }

    return {
      generos: (generos.data ?? []) as Genero[],
      relaciones: (relaciones.data ?? []) as PeliculaGenero[],
    };
  }

  /**
   * Ids de las películas más vendidas, de la primera a la última.
   * Usa la función SQL `peliculas_mas_vendidas` (ver migración 0026).
   */
  async masVendidas(limite = 3): Promise<string[]> {
    const cliente = this.supabase.cliente;

    const { data, error } = await cliente.rpc('peliculas_mas_vendidas', { limite });
    if (error) {
      throw error;
    }
    return ((data ?? []) as { pelicula_id: string }[]).map((fila) => fila.pelicula_id);
  }
}