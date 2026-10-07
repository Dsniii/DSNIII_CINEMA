import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Funcion } from '../models/funcion';

/** Columnas que se piden al leer una función. */
const CAMPOS_FUNCION =
  'id, pelicula_id, sala_id, fecha, hora_inicio, hora_fin, formato, idioma, precio_base, precio_vip, en_preventa, precio_preventa';

/** Acceso a las funciones guardadas en la base. */
@Injectable({ providedIn: 'root' })
export class Funciones {
  constructor(private readonly clienteSupabase: ClienteSupabase) {}

  /** Lista todas las funciones ordenadas por fecha y hora. */
  async listar(): Promise<Funcion[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('funciones')
      .select(CAMPOS_FUNCION)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las funciones: ${error.message}`);
    }

    return (data ?? []) as Funcion[];
  }

  /** Lista las funciones de una sala ordenadas por fecha y hora. */
  async listarPorSala(salaId: string | number): Promise<Funcion[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('funciones')
      .select(CAMPOS_FUNCION)
      .eq('sala_id', salaId)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las funciones de la sala: ${error.message}`);
    }

    return (data ?? []) as Funcion[];
  }

  /** Lista las funciones de una película ordenadas por fecha y hora, opcionalmente desde una fecha (`YYYY-MM-DD`). */
  async listarPorPelicula(peliculaId: string, desdeFecha?: string): Promise<Funcion[]> {
    let consulta = this.clienteSupabase.cliente
      .from('funciones')
      .select(CAMPOS_FUNCION)
      .eq('pelicula_id', peliculaId);

    if (desdeFecha) {
      consulta = consulta.gte('fecha', desdeFecha);
    }

    const { data, error } = await consulta
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las funciones de la película: ${error.message}`);
    }

    return (data ?? []) as Funcion[];
  }

  /** Elimina una función por id. */
  async eliminar(id: string): Promise<void> {
    const { error } = await this.clienteSupabase.cliente.from('funciones').delete().eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar la función: ${error.message}`);
    }
  }
}
