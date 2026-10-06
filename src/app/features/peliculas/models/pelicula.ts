/** Fila de la tabla `peliculas` (sin el id). */
export interface Pelicula {
  nombre: string;
  sinopsis: string;
  imagen_path: string | null;
  duracion_minutos: number;
  /** Edad mínima (18, 13…) o 0 si no tiene restricción. */
  restriccion_edad: number;
  /** Fecha en formato `YYYY-MM-DD` (columna `date`). */
  fecha_estreno: string;
  /** Días antes del estreno en que abre la preventa (0 = sin preventa). */
  dias_preventa: number;
  activa: boolean;
}

/** Datos que necesita la pantalla "Próximamente". */
export type PeliculaProxima = Pick<
  Pelicula,
  'nombre' | 'imagen_path' | 'fecha_estreno' | 'dias_preventa'
>;