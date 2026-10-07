/** Entrada emitida por la compra. */
export interface EntradaComprada {
  butaca_id: string;
  precio: number;
  qr_code: string;
  /** `true` si se pagó con la recompensa "Entrada gratis" (precio 0). */
  canjeada: boolean;
}

/** Producto pagado con dinero. */
export interface ProductoComprado {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  qr_code: string;
}

/** Unidad de producto canjeada con puntos (un canje por unidad). */
export interface CanjeComprado {
  canje_id: string;
  producto_nombre: string;
  puntos_utilizados: number;
  qr_code: string;
}

/** Lo que devuelve la RPC `confirmar_compra`. */
export interface ResultadoCompra {
  compra_id: string;
  fecha_hora: string;
  subtotal: number;
  subtotal_entradas: number;
  subtotal_productos: number;
  descuento_cupon: number;
  cupon_codigo: string | null;
  credito_utilizado: number;
  total: number;
  puntos_utilizados: number;
  entradas_canjeadas: number;
  puntos_entradas: number;
  /** Puntos de fidelización ganados por esta compra (1 por peso pagado). */
  puntos_ganados: number;
  /** Saldo de puntos después de descontar los usados y sumar los ganados. */
  puntos_restantes: number;
  credito_restante: number;
  entradas: EntradaComprada[];
  productos: ProductoComprado[];
  canjes: CanjeComprado[];
}

/** Ítem del carrito tal como lo recibe la RPC. */
export interface ItemCompra {
  producto_id: string;
  cantidad: number;
  metodo: 'dinero' | 'puntos';
}

/** Datos para confirmar la compra. */
export interface PedidoCompra {
  funcionId: string | null;
  butacaIds: string[];
  items: ItemCompra[];
  cuponId: string | null;
  credito: number;
  /** Cantidad de entradas comunes a canjear con la recompensa "Entrada gratis". */
  entradasCanje: number;
}