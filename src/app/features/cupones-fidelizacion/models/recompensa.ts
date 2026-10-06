export interface ProductoRecompensa {
  nombre: string;
  precio: number;
  imagen_path: string | null;
  activo: boolean;
  categorias_producto?: {
    nombre: string;
  } | null;
}

export interface Recompensa {
  id: string; // ID obligatorio para operaciones como update/delete por ID
  nombre: string;
  tipo: string;
  producto_id: string | null;
  costo_puntos: number;
  productos?: ProductoRecompensa | null;
}

export type RecompensaInput = Omit<Recompensa, 'id' | 'productos'>;