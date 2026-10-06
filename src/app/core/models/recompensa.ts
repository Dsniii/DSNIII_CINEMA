export interface Recompensa {
  id: string; // <-- agregar
  nombre: string;
  tipo: 'entrada' | 'producto';
  producto_id: string | null;
  costo_puntos: number;
  productos: ProductoRecompensa | null;
}

export interface ProductoRecompensa {
  nombre: string;
  precio: number;
  imagen_path: string | null;
  activo: boolean;
  categorias_producto?: {
    nombre: string;
  } | null;
}