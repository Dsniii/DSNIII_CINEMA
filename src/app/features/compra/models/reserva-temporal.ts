/** Fila de la tabla `reservas_temporales`: una butaca retenida por un tiempo limitado. */
export interface ReservaTemporal {
  id: string;
  funcion_id: string;
  butaca_id: string;
  usuario_id: string;
  creado_en: string;
  /** Instante (ISO) en que la reserva deja de bloquear la butaca. */
  expira_en: string;
}
