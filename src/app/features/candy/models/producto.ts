/** Producto de la confitería. */
export interface Producto {
	id: string;
	nombre: string;
	categoria_id: string;
	precio: number;
	imagen_path: string | null;
	activo: boolean;
}

/** Datos editables de un producto (sin id). */
export type ProductoInput = Omit<Producto, 'id'>;
