import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { ComboInput, ComboProducto, ComboProductoRegistro } from '../models/combo';

/** Columnas a consultar de la tabla combos. */
const CAMPOS_COMBO = 'id, nombre, precio_fijo, incluye_entrada, activo';

@Injectable({ providedIn: 'root' })
/** Servicio de acceso a datos de combos y su composición. */
export class Combos {
	constructor(private readonly clienteSupabase: ClienteSupabase) {}

	/** Lista todos los combos. */
	async listar(): Promise<Array<ComboInput & { id: string }>> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('combos')
			.select(CAMPOS_COMBO)
			.order('nombre', { ascending: true });

		if (error) throw new Error(`No se pudieron cargar los combos: ${error.message}`);
		return (data ?? []) as Array<ComboInput & { id: string }>;
	}

	/** Lista la composición (productos y cantidades) de todos los combos. */
	async listarProductosCombo(): Promise<ComboProductoRegistro[]> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('combo_productos')
			.select('combo_id, producto_id, cantidad');

		if (error) throw new Error(`No se pudo cargar la composición de los combos: ${error.message}`);
		return (data ?? []) as ComboProductoRegistro[];
	}

	/** Crea un combo. */
	async crear(datos: ComboInput): Promise<{ id: string }> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('combos')
			.insert(datos)
			.select('id')
			.single();

		if (error) throw new Error(`No se pudo crear el combo: ${error.message}`);
		return data as { id: string };
	}

	/** Actualiza los datos de un combo. */
	async actualizar(id: string, datos: ComboInput): Promise<void> {
		const { error } = await this.clienteSupabase.cliente.from('combos').update(datos).eq('id', id);
		if (error) throw new Error(`No se pudo actualizar el combo: ${error.message}`);
	}

	/** Activa o desactiva un combo. */
	async actualizarEstado(id: string, activo: boolean): Promise<void> {
		const { error } = await this.clienteSupabase.cliente.from('combos').update({ activo }).eq('id', id);
		if (error) throw new Error(`No se pudo cambiar el estado del combo: ${error.message}`);
	}

	/** Reemplaza la composición del combo y restaura la anterior si falla el guardado. */
	async reemplazarProductos(comboId: string, productos: ComboProducto[]): Promise<void> {
		const { data: anteriores, error: errorConsulta } = await this.clienteSupabase.cliente
			.from('combo_productos')
			.select('combo_id, producto_id, cantidad')
			.eq('combo_id', comboId);

		if (errorConsulta) {
			throw new Error(`No se pudo leer la composición anterior: ${errorConsulta.message}`);
		}

		const { error: errorBorrado } = await this.clienteSupabase.cliente
			.from('combo_productos')
			.delete()
			.eq('combo_id', comboId);

		if (errorBorrado) {
			throw new Error(`No se pudo reemplazar la composición del combo: ${errorBorrado.message}`);
		}

		if (productos.length === 0) return;

		const registros = productos.map((producto) => ({ ...producto, combo_id: comboId }));
		const { error: errorInsercion } = await this.clienteSupabase.cliente
			.from('combo_productos')
			.insert(registros);

		if (errorInsercion) {
			if (anteriores?.length) {
				await this.clienteSupabase.cliente.from('combo_productos').insert(anteriores);
			}
			throw new Error(`No se pudo guardar la composición del combo: ${errorInsercion.message}`);
		}
	}

	/** Elimina un combo junto con sus productos. */
	async eliminar(id: string): Promise<void> {
		const { error: errorProductos } = await this.clienteSupabase.cliente
			.from('combo_productos')
			.delete()
			.eq('combo_id', id);

		if (errorProductos) {
			throw new Error(`No se pudieron quitar los productos del combo: ${errorProductos.message}`);
		}

		const { error } = await this.clienteSupabase.cliente.from('combos').delete().eq('id', id);
		if (error) throw new Error(`No se pudo eliminar el combo: ${error.message}`);
	}
}
