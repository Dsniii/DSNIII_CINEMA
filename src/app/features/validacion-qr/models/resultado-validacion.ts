/** Qué pasó al validar un código. */
export type EstadoValidacion = 'validado' | 'ya_validado' | 'no_encontrado' | 'codigo_invalido';

/** Detalle de una entrada validada. */
export interface DatosEntradaValidada {
  pelicula: string;
  sala: string;
  /** Fecha de la función (`YYYY-MM-DD`). */
  fecha: string;
  hora_inicio: string;
  butaca: string;
}

/** Detalle de un producto validado. */
export interface DatosProductoValidado {
  producto: string | null;
  cantidad: number;
}

/** Detalle de un canje por puntos entregado. */
export interface DatosCanjeEntregado {
  recompensa: string | null;
  /** Nombre del producto canjeado, si la recompensa tiene uno. */
  producto: string | null;
  puntos: number;
  fecha_canje: string;
}

/** Respuesta de la RPC `validar_qr`. */
export interface ResultadoValidacion {
  resultado: EstadoValidacion;
  tipo?: 'entrada' | 'producto' | 'canje';
  /** Instante de la validación (la de ahora, o la anterior si ya estaba validado). */
  fecha_validacion?: string;
  datos?: DatosEntradaValidada | DatosProductoValidado | DatosCanjeEntregado;
}