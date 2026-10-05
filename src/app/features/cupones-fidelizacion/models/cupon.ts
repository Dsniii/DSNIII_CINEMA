/** Cupón de descuento por segmento de clientes. */
export interface Cupon {
	id: string;
	codigo: string;
	descripcion: string;
	porcentaje_descuento: number;
	segmento: string;
	fecha_inicio: string;
	fecha_fin: string | null;
	usos_maximo: number | null;
	activo: boolean;
}

/** Datos editables de un cupón (sin id). */
export type CuponInput = Omit<Cupon, 'id'>;
