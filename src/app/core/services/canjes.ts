import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from './supabase-client';
import { ResultadoCanje } from '../models/canje';

@Injectable({ providedIn: 'root' })
export class Canjes {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Canjea la recompensa indicada: resta los puntos en `perfiles` y crea
   * la fila en `canjes`, todo en una sola transacción atómica del lado
   * de la base (ver función `canjear_recompensa` en el schema).
   */
  async canjear(recompensaId: string): Promise<ResultadoCanje> {
    const { data, error } = await this.supabase.rpc('canjear_recompensa', {
      p_recompensa_id: recompensaId,
    });

    if (error) {
      throw error;
    }

    const resultado = (data as ResultadoCanje[])[0];
    if (!resultado) {
      throw new Error('El canje no devolvió resultado.');
    }

    return resultado;
  }
}