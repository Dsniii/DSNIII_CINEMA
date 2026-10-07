import { Service, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { PedidoCompra, ResultadoCompra } from '../models/resultado-compra';

/** Servicio con la lógica de la compra de entradas y productos. */
@Service()
export class Compra {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Confirma la compra en una sola transacción de la base (`confirmar_compra`):
   * registra compra, entradas, productos y canjes, y recién al final descuenta
   * puntos y crédito del perfil. Las butacas reservadas quedan sin vencimiento.
   */
  async confirmar(pedido: PedidoCompra): Promise<ResultadoCompra> {
    const { data, error } = await this.supabase.rpc('confirmar_compra', {
      p_funcion_id: pedido.funcionId,
      p_butacas: pedido.butacaIds,
      p_items: pedido.items,
      p_cupon_id: pedido.cuponId,
      p_credito: pedido.credito,
      p_entradas_canje: pedido.entradasCanje,
    });

    if (error) {
      throw new Error(error.message || 'No se pudo confirmar la compra.');
    }
    if (!data) {
      throw new Error('La compra no devolvió resultado.');
    }
    return data as ResultadoCompra;
  }
}