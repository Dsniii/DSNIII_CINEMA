/** Producto incluido en un combo con su cantidad. */
export interface ComboProducto {
	producto_id: string;
	cantidad: number;
}

/** Combo de productos con precio fijo. */
export interface Combo {
	id: string;
	nombre: string;
	precio_fijo: number;
	incluye_entrada: boolean;
	activo: boolean;
	productos: ComboProducto[];
}

/** Datos editables de un combo (sin id ni productos). */
export type ComboInput = Omit<Combo, 'id' | 'productos'>;

/** Fila de la tabla que relaciona combo y producto. */
export interface ComboProductoRegistro extends ComboProducto {
	combo_id: string;
}
