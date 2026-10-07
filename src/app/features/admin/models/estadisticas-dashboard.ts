/** Entrada vendida (de una compra confirmada) con la película a la que corresponde. */
export interface EntradaVista {
  /** Día en que se compró la entrada (hora local), `AAAA-MM-DD`. */
  fecha: string;
  pelicula: string;
}

/** Línea de una compra de producto del candy bar (compra confirmada). */
export interface VentaProducto {
  productoId: string;
  nombre: string;
  cantidad: number;
}

export type TipoPeriodo = 'semana' | 'mes';

/** Película y cuántas entradas se vendieron para verla en un período. */
export interface PeliculaRanking {
  nombre: string;
  entradas: number;
}

/** Ranking de películas de una semana o de un mes. */
export interface PeriodoRanking {
  /** Lunes de la semana (`AAAA-MM-DD`) o mes (`AAAA-MM`). */
  clave: string;
  etiqueta: string;
  /** Entradas del período, sumando todas las películas. */
  total: number;
  /** De la más vista a la menos vista. */
  peliculas: PeliculaRanking[];
}

/** Producto del candy bar y sus unidades vendidas. */
export interface ProductoVendido {
  productoId: string;
  nombre: string;
  unidades: number;
}
