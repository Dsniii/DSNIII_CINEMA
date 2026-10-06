/** Resultado de canjear una recompensa, tal como lo devuelve la RPC `canjear_recompensa`. */
export interface ResultadoCanje {
  canje_id: string;
  qr_code: string;
  fecha: string;
  puntos_utilizados: number;
  puntos_restantes: number;
  recompensa_nombre: string;
  recompensa_tipo: string;
}