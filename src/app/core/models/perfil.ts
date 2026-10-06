/** Fila de la tabla `perfiles` (sin el id). */
export interface Perfil {
  nombre: string;
  apellido: string;
  /** Fecha en formato `YYYY-MM-DD` (columna `date`). */
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  rol: string;
  /** Marca de tiempo ISO 8601 (columna `timestamptz`). */
  creado_en: string;
  /** Crédito a favor en ARS (columna `numeric`). */
  credito: number;
  /** Puntos de fidelización acumulados (columna `int4`). */
  puntos_fidelizacion: number;
}