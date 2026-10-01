import { Injectable } from '@angular/core';
import { SupabaseClient as SupabaseClientService } from '../../../core/services/supabase-client';

export interface SalaCreada {
  id: number | string;
  nombre: string;
}

export interface ButacaNueva {
  sala_id: number | string;
  fila: number;
  columna: number;
  tipo: 'normal' | 'accesible' | 'vip';
}

const CANTIDAD_FILAS = 20;
const FILAS_ACCESIBLES = new Set([10, 11]);
const PRIMERA_FILA_VIP = 18;

export function generarButacas(salaId: number | string): ButacaNueva[] {
  return Array.from({ length: CANTIDAD_FILAS }, (_, indexFila) => {
    const fila = indexFila + 1;
    const esAccesible = FILAS_ACCESIBLES.has(fila);
    const cantidadColumnas = esAccesible ? 14 : 28;
    const tipo: ButacaNueva['tipo'] = esAccesible
      ? 'accesible'
      : fila >= PRIMERA_FILA_VIP
        ? 'vip'
        : 'normal';

    return Array.from({ length: cantidadColumnas }, (_, indexColumna) => ({
      sala_id: salaId,
      fila,
      columna: indexColumna + 1,
      tipo,
    }));
  }).flat();
}

@Injectable({ providedIn: 'root' })
export class Salas {
  constructor(private readonly supabaseClient: SupabaseClientService) {}

  async listarSalas(): Promise<SalaCreada[]> {
    const { data, error } = await this.supabaseClient.client
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

  async crearSalaConButacas(nombre: string): Promise<SalaCreada> {
    const client = this.supabaseClient.client;
    const { data: sala, error: errorSala } = await client
      .from('salas')
      .insert({ nombre })
      .select('id, nombre')
      .single();

    if (errorSala) {
      throw new Error(`No se pudo crear la sala: ${errorSala.message}`);
    }

    const butacas = generarButacas(sala.id as number | string);
    const { error: errorButacas } = await client.from('butacas').insert(butacas);

    if (errorButacas) {
      const { error: errorRollback } = await client.from('salas').delete().eq('id', sala.id);
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

  async actualizarNombreSala(id: number | string, nombre: string): Promise<SalaCreada> {
    const { data, error } = await this.supabaseClient.client
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

  async eliminarSalaConButacas(id: number | string): Promise<void> {
    const { error } = await this.supabaseClient.client.rpc('eliminar_sala_con_butacas', {
      p_sala_id: String(id),
    });

    if (error) {
      throw new Error(`No se pudo eliminar la sala y sus butacas: ${error.message}`);
    }
  }
}
