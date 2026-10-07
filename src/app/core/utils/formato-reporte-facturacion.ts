import { ReporteFacturacion } from '../../features/admin/models/reporte-facturacion';
import { fechaLocal } from '../../features/admin/utils/armar-reporte-facturacion';

const FORMATO_DIA = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const FORMATO_GENERADO = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const FORMATO_PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `2020-02-28` → `28/02/2020`. */
export function diaLegible(fecha: string): string {
  const dia = fechaLocal(fecha);
  return dia ? FORMATO_DIA.format(dia) : fecha;
}

/** Importe en pesos con centavos, para el PDF. */
export function pesos(valor: number): string {
  return FORMATO_PESOS.format(valor);
}

/** Línea con el período del reporte (`Día: 28/02/2020` o `Del … al …`). */
export function periodoLegible(reporte: ReporteFacturacion): string {
  return reporte.desde === reporte.hasta
    ? `Día: ${diaLegible(reporte.desde)}`
    : `Del ${diaLegible(reporte.desde)} al ${diaLegible(reporte.hasta)}`;
}

/** Fecha y hora en que se generó el reporte. */
export function generadoLegible(reporte: ReporteFacturacion): string {
  return FORMATO_GENERADO.format(reporte.generadoEn);
}

/** Nombre del archivo sin extensión: `reporte-facturacion-2020-02-28` o `…-2020-02-01_2020-02-29`. */
export function nombreArchivoReporte(reporte: ReporteFacturacion): string {
  return reporte.desde === reporte.hasta
    ? `reporte-facturacion-${reporte.desde}`
    : `reporte-facturacion-${reporte.desde}_${reporte.hasta}`;
}
