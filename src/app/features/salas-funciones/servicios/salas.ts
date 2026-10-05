import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';

/** Sala con su identificador y nombre. */
export interface SalaCreada {
  id: number | string;
  nombre: string;
}

/** Butaca a insertar para una sala. */
export interface ButacaNueva {
  sala_id: number | string;
  fila: number;
  columna: number;
  tipo: 'normal' | 'accesible' | 'vip';
}

/** Distribución de la sala: filas totales, filas accesibles y primera fila VIP. */
const CANTIDAD_FILAS = 20;
const FILAS_ACCESIBLES = new Set([10, 11]);
const PRIMERA_FILA_VIP = 18;

/** Genera las butacas de una sala: filas 10-11 accesibles (14 columnas), desde la 18 VIP. */
export function generarButacas(salaId: number | string): ButacaNueva[] {
  return Array.from({ length: CANTIDAD_FILAS }, (_, indiceFila) => {
    const fila = indiceFila + 1;
    const esAccesible = FILAS_ACCESIBLES.has(fila);
    const cantidadColumnas = esAccesible ? 14 : 28;
    const tipo: ButacaNueva['tipo'] = esAccesible
      ? 'accesible'
      : fila >= PRIMERA_FILA_VIP
        ? 'vip'
        : 'normal';

    return Array.from({ length: cantidadColumnas }, (_, indiceColumna) => ({
      sala_id: salaId,
      fila,
      columna: indiceColumna + 1,
      tipo,
    }));
  }).flat();
}

/** Gestión de salas y sus butacas. */
@Injectable({ providedIn: 'root' })
export class Salas {
  constructor(private readonly clienteSupabase: ClienteSupabase) {}

  /** Lista las salas ordenadas por id. */
  async listarSalas(): Promise<SalaCreada[]> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('salas')
      .select('id, nombre')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las salas: ${error.message}`);
    }

    return (data ?? []).map((sala) => ({
      id: sala.id as number | string,
      nombre: String(sala.nombre),
    }));
  }

  /** Crea la sala y sus butacas; si fallan las butacas, revierte la sala. */
  async crearSalaConButacas(nombre: string): Promise<SalaCreada> {
    const cliente = this.clienteSupabase.cliente;
    const { data: sala, error: errorSala } = await cliente
      .from('salas')
      .insert({ nombre })
      .select('id, nombre')
      .single();

    if (errorSala) {
      throw new Error(`No se pudo crear la sala: ${errorSala.message}`);
    }

    const butacas = generarButacas(sala.id as number | string);
    const { error: errorButacas } = await cliente.from('butacas').insert(butacas);

    if (errorButacas) {
      const { error: errorRollback } = await cliente.from('salas').delete().eq('id', sala.id);
      const detalleRollback = errorRollback
        ? ' Tampoco se pudo revertir el registro de la sala.'
        : '';

      throw new Error(
        `No se pudieron crear las butacas: ${errorButacas.message}.${detalleRollback}`,
      );
    }

    return {
      id: sala.id as number | string,
      nombre: sala.nombre as string,
    };
  }

  /** Cambia el nombre de una sala. */
  async actualizarNombreSala(id: number | string, nombre: string): Promise<SalaCreada> {
    const { data, error } = await this.clienteSupabase.cliente
      .from('salas')
      .update({ nombre })
      .eq('id', id)
      .select('id, nombre')
      .single();

    if (error) {
      throw new Error(`No se pudo actualizar la sala: ${error.message}`);
    }

    return {
      id: data.id as number | string,
      nombre: String(data.nombre),
    };
  }

  /** Elimina la sala junto con sus butacas. */
  async eliminarSalaConButacas(id: number | string): Promise<void> {
    const { error } = await this.clienteSupabase.cliente.rpc('eliminar_sala_con_butacas', {
      p_sala_id: String(id),
    });

    if (error) {
      throw new Error(`No se pudo eliminar la sala y sus butacas: ${error.message}`);
    }
  }
}
