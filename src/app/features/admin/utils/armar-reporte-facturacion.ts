import {
  CompraParaReporte,
  ReporteFacturacion,
  TotalesFacturacion,
  VentaDiaria,
} from '../models/reporte-facturacion';

/** Máximo de días que puede abarcar un reporte (evita consultas y archivos enormes). */
export const MAXIMO_DIAS_REPORTE = 366;

const FORMATO_FECHA_CORTA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Convierte `AAAA-MM-DD` en una fecha local a medianoche; `null` si no es un día válido. */
export function fechaLocal(texto: string): Date | null {
  const partes = FORMATO_FECHA_CORTA.exec(texto);
  if (!partes) {
    return null;
  }
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(anio, mes - 1, dia);
  const coincide =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return coincide ? fecha : null;
}

/** Día calendario local de una fecha, formato `AAAA-MM-DD`. */
export function claveDeDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Hoy (según el reloj del navegador) como `AAAA-MM-DD`. */
export function hoy(): string {
  return claveDeDia(new Date());
}

/**
 * Instantes (ISO 8601) que delimitan el período: desde las 00:00 del primer día (inclusive)
 * hasta las 00:00 del día siguiente al último (exclusivo). Se usa la hora local del navegador.
 */
export function limitesDelPeriodo(desde: string, hasta: string): { inicio: string; fin: string } {
  const primero = fechaLocal(desde);
  const ultimo = fechaLocal(hasta);
  if (!primero || !ultimo) {
    throw new Error('Las fechas del reporte no son válidas.');
  }
  const finExclusivo = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1);
  return { inicio: primero.toISOString(), fin: finExclusivo.toISOString() };
}

/** Valida el período elegido; devuelve el mensaje de error o `null` si está bien. */
export function validarPeriodo(desde: string, hasta: string): string | null {
  const primero = fechaLocal(desde);
  const ultimo = fechaLocal(hasta);
  if (!primero || !ultimo) {
    return 'Elegí las dos fechas del reporte.';
  }
  if (primero > ultimo) {
    return 'La fecha "Desde" no puede ser posterior a "Hasta".';
  }
  if (diasEntre(primero, ultimo) > MAXIMO_DIAS_REPORTE) {
    return `El período no puede superar los ${MAXIMO_DIAS_REPORTE} días.`;
  }
  return null;
}

/** Redondea a centavos para no arrastrar errores de punto flotante al sumar. */
function aCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function numero(valor: number | string | null | undefined): number {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function diasEntre(primero: Date, ultimo: Date): number {
  const inicio = Date.UTC(primero.getFullYear(), primero.getMonth(), primero.getDate());
  const fin = Date.UTC(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

function totalesVacios(): TotalesFacturacion {
  return { compras: 0, entradas: 0, subtotal: 0, descuentos: 0, credito: 0, facturado: 0 };
}

function redondear(totales: TotalesFacturacion): TotalesFacturacion {
  return {
    compras: totales.compras,
    entradas: totales.entradas,
    subtotal: aCentavos(totales.subtotal),
    descuentos: aCentavos(totales.descuentos),
    credito: aCentavos(totales.credito),
    facturado: aCentavos(totales.facturado),
  };
}

/**
 * Agrupa las compras confirmadas por día calendario local y calcula los totales del período.
 * Todos los días entre `desde` y `hasta` aparecen en el reporte, aunque no tengan ventas.
 */
export function armarReporteFacturacion(
  compras: readonly CompraParaReporte[],
  desde: string,
  hasta: string,
  generadoEn: Date = new Date(),
): ReporteFacturacion {
  const error = validarPeriodo(desde, hasta);
  if (error) {
    throw new Error(error);
  }

  const primero = fechaLocal(desde) as Date;
  const cantidadDias = diasEntre(primero, fechaLocal(hasta) as Date);

  const porDia = new Map<string, TotalesFacturacion>();
  for (let i = 0; i < cantidadDias; i++) {
    const dia = new Date(primero.getFullYear(), primero.getMonth(), primero.getDate() + i);
    porDia.set(claveDeDia(dia), totalesVacios());
  }

  for (const compra of compras) {
    const instante = new Date(compra.fecha_hora);
    if (Number.isNaN(instante.getTime())) {
      continue;
    }
    const acumulado = porDia.get(claveDeDia(instante));
    if (!acumulado) {
      continue;
    }
    acumulado.compras += 1;
    acumulado.entradas += numero(compra.entradas?.[0]?.count);
    acumulado.subtotal += numero(compra.subtotal);
    acumulado.descuentos += numero(compra.descuento_cupon);
    acumulado.credito += numero(compra.credito_utilizado);
    acumulado.facturado += numero(compra.total);
  }

  const dias: VentaDiaria[] = [...porDia.entries()].map(([fecha, totales]) => ({
    fecha,
    ...redondear(totales),
  }));

  const suma = totalesVacios();
  for (const dia of dias) {
    suma.compras += dia.compras;
    suma.entradas += dia.entradas;
    suma.subtotal += dia.subtotal;
    suma.descuentos += dia.descuentos;
    suma.credito += dia.credito;
    suma.facturado += dia.facturado;
  }

  return { desde, hasta, dias, totales: redondear(suma), generadoEn };
}
