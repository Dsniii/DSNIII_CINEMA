/** Tipos de butaca tal como se guardan en la base. */
export type TipoButaca = 'normal' | 'accesible' | 'vip';

/** Butaca de una sala (fila de la tabla `butacas`). */
export interface Butaca {
  id: string;
  sala_id: string;
  /** Fila numérica (1 = A, 2 = B…). */
  fila: number;
  columna: number;
  tipo: TipoButaca;
}

/** Letra de la fila a partir de su número (1 → A). */
export function letraFila(fila: number): string {
  return String.fromCharCode(64 + fila);
}

/** Nombre corto de la butaca, por ejemplo `C12`. */
export function nombreButaca(butaca: Pick<Butaca, 'fila' | 'columna'>): string {
  return `${letraFila(butaca.fila)}${butaca.columna}`;
}
