/** Fila de la tabla `log_actividad` tal como la devuelve la base. */
export interface RegistroLog {
  usuario_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: string | null;
  /** Instante (ISO 8601) en que ocurrió la acción. */
  fecha_hora: string;
}

/** Usuario interno (admin o empleado) con los datos que se muestran en pantalla. */
export interface UsuarioInterno {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
