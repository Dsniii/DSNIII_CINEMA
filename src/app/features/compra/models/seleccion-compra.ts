import { Funcion } from '../../salas-funciones/models/funcion';

/** Categorías de entrada que se cobran. Las butacas accesibles cuentan como `normal`. */
export type CategoriaEntrada = 'normal' | 'vip';

/** Cantidad de entradas por categoría. */
export interface CantidadesEntradas {
  normal: number;
  vip: number;
}

/** Precio unitario por categoría. */
export interface PreciosEntrada {
  normal: number;
  vip: number;
}

/** Butaca elegida, con lo mínimo que necesita el resto de la compra. */
export interface ButacaElegida {
  id: string;
  fila: number;
  columna: number;
  categoria: CategoriaEntrada;
}

/** Lo que la selección de butacas le entrega a la compra de productos. */
export interface SeleccionCompra {
  peliculaId: string;
  funcion: Funcion;
  cantidades: CantidadesEntradas;
  precios: PreciosEntrada;
  /** Precio acumulado de las entradas. */
  total: number;
  butacas: ButacaElegida[];
  /** Vencimiento (ISO) de la reserva; `null` si no hubo reserva (compra sin sesión). */
  reservaExpiraEn: string | null;
}
