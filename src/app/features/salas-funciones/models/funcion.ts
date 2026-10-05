/** Formatos de proyección disponibles. */
export type FormatoFuncion = '2D' | '3D' | '4D' | '5D';
/** Idiomas en los que se proyecta una función. */
export type IdiomaFuncion = 'castellano' | 'subtitulada';

/** Función (proyección) tal como se guarda en la base. */
export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
  precio_base: number;
  precio_vip: number;
  en_preventa: boolean;
  precio_preventa: number;
}

/** Datos que carga el usuario; la sala y la hora fin se calculan al guardar. */
export type FuncionInput = Omit<Funcion, 'id' | 'sala_id' | 'hora_fin'>;
