import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';

/** Género de película. */
export interface Genero {
  id: string;
  nombre: string;
}

/** Película con sus géneros asociados. */
export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis: string | null;
  imagen_path: string | null;
  duracion_minutos: number;
  restriccion_edad: number;
  fecha_estreno: string;
  dias_preventa: number;
  activa: boolean;
  generos: Genero[];
}

/** Datos editables de una película (sin id ni géneros). */
export type PeliculaInput = Omit<Pelicula, 'id' | 'generos'>;

/** Columnas a consultar de la tabla peliculas. */
const CAMPOS_PELICULA =
  'id, nombre, sinopsis, imagen_path, duracion_minutos, restriccion_edad, fecha_estreno, dias_preventa, activa';
const CAMPOS_PELICULA_CON_GENEROS = `${CAMPOS_PELICULA}, pelicula_generos(generos(id, nombre))`;

/** Fila de película tal como la devuelve la consulta con relaciones. */
interface PeliculaConRelaciones extends Omit<Pelicula, 'generos'> {
  pelicula_generos: { generos: Genero | null }[] | null;
}

@Injectable({ providedIn: 'root' })
/** Servicio de acceso a datos de películas y géneros. */
export class Peliculas {
  constructor(private readonly clienteSupabase: ClienteSupabase) {}

  /** Lista solo id y nombre de todas las películas. */
  async listarNombres(): Promise<Pick<Pelicula, 'id' | 'nombre'>[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('peliculas')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar los nombres de películas: ${error.message}`);
    }

    return (data ?? []).map((pelicula) => ({
      id: String(pelicula.id),
      nombre: String(pelicula.nombre),
    }));
  }

  /** Lista las películas con sus géneros. */
  async listar(): Promise<Pelicula[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('peliculas')
      .select(CAMPOS_PELICULA_CON_GENEROS)
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las películas: ${error.message}`);
    }

    return ((data ?? []) as unknown as PeliculaConRelaciones[]).map((pelicula) => ({
      id: pelicula.id,
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis,
      imagen_path: pelicula.imagen_path,
      duracion_minutos: pelicula.duracion_minutos,
      restriccion_edad: pelicula.restriccion_edad,
      fecha_estreno: pelicula.fecha_estreno,
      dias_preventa: pelicula.dias_preventa,
      activa: pelicula.activa,
      generos: (pelicula.pelicula_generos ?? [])
        .map((relacion) => relacion.generos)
        .filter((genero): genero is Genero => genero !== null),
    }));
  }

  /** Lista todos los géneros. */
  async listarGeneros(): Promise<Genero[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('generos')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar los géneros: ${error.message}`);
    }

    return (data ?? []) as Genero[];
  }

  /** Crea una película. */
  async crear(datos: PeliculaInput): Promise<Pelicula> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('peliculas')
      .insert(datos)
      .select(CAMPOS_PELICULA)
      .single();

    if (error) {
      throw new Error(`No se pudo crear la película: ${error.message}`);
    }

    return { ...(data as Omit<Pelicula, 'generos'>), generos: [] };
  }

  /** Actualiza los datos de una película. */
  async actualizar(id: string, datos: PeliculaInput): Promise<Pelicula> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('peliculas')
      .update(datos)
      .eq('id', id)
      .select(CAMPOS_PELICULA)
      .single();

    if (error) {
      throw new Error(`No se pudo actualizar la película: ${error.message}`);
    }

    return { ...(data as Omit<Pelicula, 'generos'>), generos: [] };
  }

  /** Activa o da de baja una película. */
  async actualizarEstado(id: string, activa: boolean): Promise<Pelicula> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('peliculas')
      .update({ activa })
      .eq('id', id)
      .select(CAMPOS_PELICULA)
      .single();

    if (error) {
      throw new Error(`No se pudo cambiar el estado de la película: ${error.message}`);
    }

    return { ...(data as Omit<Pelicula, 'generos'>), generos: [] };
  }

  /** Reemplaza los géneros de una película (sin repetidos). */
  async reemplazarGeneros(peliculaId: string, generoIds: string[]): Promise<void> {
    const { error } = await this.clienteSupabase.cliente.rpc('reemplazar_generos_pelicula', {
      p_pelicula_id: peliculaId,
      p_genero_ids: [...new Set(generoIds)],
    });

    if (error) {
      throw new Error(`No se pudieron guardar los géneros: ${error.message}`);
    }
  }
}
