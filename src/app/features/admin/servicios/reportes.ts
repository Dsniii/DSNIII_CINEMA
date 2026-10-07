import { Service, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { CompraParaReporte, ReporteFacturacion } from '../models/reporte-facturacion';
import {
  armarReporteFacturacion,
  limitesDelPeriodo,
  validarPeriodo,
} from '../utils/armar-reporte-facturacion';

/** Estado con el que `confirmar_compra` guarda las compras cobradas; las demás no facturan. */
export const ESTADO_COMPRA_FACTURADA = 'confirmada';
/** Filas que se leen por consulta (Supabase corta en 1000 por defecto). */
export const TAMANO_LOTE_COMPRAS = 1000;

/** Servicio para obtener los reportes de administración. */
@Service()
export class Reportes {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Reporte de facturación y ventas por día entre `desde` y `hasta` (ambos inclusive, `AAAA-MM-DD`).
   * Cuenta solo compras confirmadas: lo facturado es la suma de `total` y las entradas vendidas
   * son las filas de `entradas` de esas compras.
   */
  async obtenerFacturacion(desde: string, hasta: string): Promise<ReporteFacturacion> {
    const error = validarPeriodo(desde, hasta);
    if (error) {
      throw new Error(error);
    }

    const { inicio, fin } = limitesDelPeriodo(desde, hasta);
    const compras: CompraParaReporte[] = [];

    for (let primero = 0; ; primero += TAMANO_LOTE_COMPRAS) {
      const { data, error: falla } = await this.supabase
        .from('compras')
        .select('fecha_hora, subtotal, descuento_cupon, credito_utilizado, total, entradas(count)')
        .eq('estado', ESTADO_COMPRA_FACTURADA)
        .gte('fecha_hora', inicio)
        .lt('fecha_hora', fin)
        .order('fecha_hora', { ascending: true })
        .order('id', { ascending: true })
        .range(primero, primero + TAMANO_LOTE_COMPRAS - 1);

      if (falla) {
        throw new Error(`No se pudo cargar el reporte de facturación: ${falla.message}`);
      }

      const lote = (data ?? []) as unknown as CompraParaReporte[];
      compras.push(...lote);
      if (lote.length < TAMANO_LOTE_COMPRAS) {
        break;
      }
    }

    return armarReporteFacturacion(compras, desde, hasta);
  }
}
