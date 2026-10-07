/** Compra confirmada tal como se lee de Supabase para armar el reporte (con la cantidad de entradas embebida). */
export interface CompraParaReporte {
  fecha_hora: string;
  subtotal: number | string;
  descuento_cupon: number | string;
  credito_utilizado: number | string;
  total: number | string;
  /** Resultado de `entradas(count)`: un único elemento con la cantidad de entradas de la compra. */
  entradas: { count: number }[] | null;
}

/** Importes y cantidades que se suman tanto por día como en el total del período. */
export interface TotalesFacturacion {
  compras: number;
  entradas: number;
  subtotal: number;
  descuentos: number;
  credito: number;
  /** Lo que realmente se cobró: suma de `compras.total` (ya sin cupón ni crédito). */
  facturado: number;
}

/** Facturación y ventas de un día. */
export interface VentaDiaria extends TotalesFacturacion {
  /** Día calendario, formato `AAAA-MM-DD`. */
  fecha: string;
}

/** Reporte completo de un período: un renglón por día (incluso sin ventas) y los totales. */
export interface ReporteFacturacion {
  /** Primer día del período, `AAAA-MM-DD`. */
  desde: string;
  /** Último día del período (inclusive), `AAAA-MM-DD`. */
  hasta: string;
  dias: VentaDiaria[];
  totales: TotalesFacturacion;
  generadoEn: Date;
}
