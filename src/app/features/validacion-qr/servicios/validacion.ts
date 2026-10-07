import { Service, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { ResultadoValidacion } from '../models/resultado-validacion';

/** Servicio para validar entradas y productos por código QR. */
@Service()
export class Validacion {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Busca el código en `entradas` y `compra_productos` y, si todavía no estaba validado,
   * lo marca como validado con la fecha actual (todo en la base, de forma atómica).
   */
  async validar(codigo: string): Promise<ResultadoValidacion> {
    const limpio = codigo.trim();
    if (!limpio) {
      return { resultado: 'codigo_invalido' };
    }

    const { data, error } = await this.supabase.rpc('validar_qr', { p_codigo: limpio });
    if (error) {
      throw new Error(error.message || 'No se pudo validar el código.');
    }
    return data as ResultadoValidacion;
  }
}