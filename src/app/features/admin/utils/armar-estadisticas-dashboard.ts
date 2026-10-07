import {
  EntradaVista,
  PeliculaRanking,
  PeriodoRanking,
  ProductoVendido,
  TipoPeriodo,
  VentaProducto,
} from '../models/estadisticas-dashboard';
import { claveDeDia, fechaLocal } from './armar-reporte-facturacion';

/** Cuántas semanas (contando la actual) se pueden consultar. */
export const SEMANAS_VISIBLES = 52;
/** Cuántos meses (contando el actual) se pueden consultar. */
export const MESES_VISIBLES = 12;

const FORMATO_MES = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });

/** Lunes de la semana de `fecha` (las semanas van de lunes a domingo), a medianoche local. */
export function inicioDeSemana(fecha: Date): Date {
  const atrasados = (fecha.getDay() + 6) % 7;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - atrasados);
}

function claveDeMes(fecha: Date): string {
  return claveDeDia(fecha).slice(0, 7);
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** `Semana del 05/10 al 11/10/2026` (armado a mano para que no dependa del navegador). */
function etiquetaSemana(lunes: Date): string {
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  const corta = (fecha: Date) => `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}`;
  return `Semana del ${corta(lunes)} al ${corta(domingo)}/${domingo.getFullYear()}`;
}

/** Primer día (`AAAA-MM-DD`) desde el que hay que leer entradas para cubrir semanas y meses visibles. */
export function inicioDeVentana(ahora: Date = new Date()): string {
  const lunes = inicioDeSemana(
    new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (SEMANAS_VISIBLES - 1) * 7),
  );
  const mes = new Date(ahora.getFullYear(), ahora.getMonth() - (MESES_VISIBLES - 1), 1);
  return claveDeDia(lunes < mes ? lunes : mes);
}

/** Claves y etiquetas de los períodos consultables, del actual hacia atrás. */
function generarPeriodos(tipo: TipoPeriodo, ahora: Date): { clave: string; etiqueta: string }[] {
  const periodos: { clave: string; etiqueta: string }[] = [];

  if (tipo === 'semana') {
    const actual = inicioDeSemana(ahora);
    for (let i = 0; i < SEMANAS_VISIBLES; i++) {
      const lunes = new Date(actual.getFullYear(), actual.getMonth(), actual.getDate() - i * 7);
      periodos.push({ clave: claveDeDia(lunes), etiqueta: etiquetaSemana(lunes) });
    }
  } else {
    for (let i = 0; i < MESES_VISIBLES; i++) {
      const mes = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      periodos.push({ clave: claveDeMes(mes), etiqueta: mayuscula(FORMATO_MES.format(mes)) });
    }
  }

  return periodos;
}

/**
 * Ranking de películas por semana o por mes, del período actual hacia atrás (todos aparecen,
 * incluso sin entradas). Cada entrada cuenta en el período en que se compró.
 */
export function armarRankingPeliculas(
  entradas: readonly EntradaVista[],
  tipo: TipoPeriodo,
  ahora: Date = new Date(),
): PeriodoRanking[] {
  const porPeriodo = new Map<string, Map<string, number>>();

  for (const entrada of entradas) {
    const dia = fechaLocal(entrada.fecha);
    if (!dia) {
      continue;
    }
    const clave = tipo === 'semana' ? claveDeDia(inicioDeSemana(dia)) : claveDeMes(dia);
    const peliculas = porPeriodo.get(clave) ?? new Map<string, number>();
    peliculas.set(entrada.pelicula, (peliculas.get(entrada.pelicula) ?? 0) + 1);
    porPeriodo.set(clave, peliculas);
  }

  return generarPeriodos(tipo, ahora).map(({ clave, etiqueta }) => {
    const conteo = porPeriodo.get(clave) ?? new Map<string, number>();
    const peliculas: PeliculaRanking[] = [...conteo.entries()]
      .map(([nombre, cantidad]) => ({ nombre, entradas: cantidad }))
      .sort((a, b) => b.entradas - a.entradas || a.nombre.localeCompare(b.nombre, 'es'));
    return {
      clave,
      etiqueta,
      total: peliculas.reduce((suma, pelicula) => suma + pelicula.entradas, 0),
      peliculas,
    };
  });
}

/** Productos del candy bar de más a menos vendidos (suma de `cantidad` por producto). */
export function armarRankingProductos(ventas: readonly VentaProducto[]): ProductoVendido[] {
  const porProducto = new Map<string, ProductoVendido>();

  for (const venta of ventas) {
    const cantidad = Number(venta.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      continue;
    }
    const actual = porProducto.get(venta.productoId);
    if (actual) {
      actual.unidades += cantidad;
    } else {
      porProducto.set(venta.productoId, {
        productoId: venta.productoId,
        nombre: venta.nombre,
        unidades: cantidad,
      });
    }
  }

  return [...porProducto.values()].sort(
    (a, b) => b.unidades - a.unidades || a.nombre.localeCompare(b.nombre, 'es'),
  );
}
