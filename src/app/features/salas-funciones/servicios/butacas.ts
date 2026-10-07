import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Butaca } from '../models/butaca';

/** Lectura de las butacas de una sala. */
@Injectable({ providedIn: 'root' })
export class Butacas {
  private readonly supabase = inject(ClienteSupabase);

  /** Lista las butacas de la sala ordenadas por fila y columna. */
  async listarPorSala(salaId: string): Promise<Butaca[]> {
    const { data, error } = await this.supabase.cliente
      .from('butacas')
      .select('id, sala_id, fila, columna, tipo')
      .eq('sala_id', salaId)
      .order('fila', { ascending: true })
      .order('columna', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar las butacas: ${error.message}`);
    }

    return (data ?? []) as Butaca[];
  }
}
