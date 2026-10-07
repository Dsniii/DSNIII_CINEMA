export interface Producto {
  id: string; // uuid
  nombre: string;
  categoria_id: string;
  precio: number;
  imagen_path: string;
  activo: boolean;
}

export interface Recompensa {
  id: string; // uuid
  nombre: string;
  tipo: string;
  producto_id: string;
  costo_puntos: number;
  producto?: Producto; // Datos expandidos del producto asociado
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  metodoPago: 'dinero' | 'puntos' | 'credito';
  puntosRequeridos?: number;
}