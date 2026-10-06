import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Recompensa, RecompensaInput } from '../models/recompensa';


const CAMPOS_RECOMPENSA = 'id, nombre, tipo, producto_id, costo_puntos';
const NOMBRE_ENTRADA_GRATIS = 'Entrada gratis';
/** Costo inicial con el que se crea la recompensa de entrada, la primera vez que no existe. */
const COSTO_INICIAL_ENTRADA = 500;

/** Acceso a datos de recompensas canjeables por puntos de fidelización. */
@Injectable({ providedIn: 'root' })
export class Recompensas {
	constructor(private readonly clienteSupabase: ClienteSupabase) {}

	/** Lista todas las recompensas. */
	async listar(): Promise<Recompensa[]> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('recompensas')
			.select(CAMPOS_RECOMPENSA)
			.order('nombre', { ascending: true });

		if (error) {
			throw new Error(`No se pudieron cargar las recompensas: ${error.message}`);
		}
		return (data ?? []) as Recompensa[];
	}

	/** Busca la recompensa de tipo 'producto' vinculada a ese producto, si existe. */
	async obtenerPorProducto(productoId: string): Promise<Recompensa | null> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('recompensas')
			.select(CAMPOS_RECOMPENSA)
			.eq('tipo', 'producto')
			.eq('producto_id', productoId)
			.maybeSingle();

		if (error) {
			throw new Error(`No se pudo consultar la recompensa del producto: ${error.message}`);
		}
		return (data ?? null) as Recompensa | null;
	}

	/**
	 * Crea, actualiza o elimina la recompensa de un producto según el costo en puntos.
	 * `costoPuntos` nulo, indefinido o ≤ 0 significa "no canjeable": si existía, se borra.
	 */
	async guardarParaProducto(
		productoId: string,
		nombreProducto: string,
		costoPuntos: number | null,
	): Promise<Recompensa | null> {
		const existente = await this.obtenerPorProducto(productoId);

		if (!costoPuntos || costoPuntos <= 0) {
			if (existente) {
				await this.eliminar(existente.id);
			}
			return null;
		}

		const datos: RecompensaInput = {
			nombre: nombreProducto,
			tipo: 'producto',
			producto_id: productoId,
			costo_puntos: costoPuntos,
		};

		const { data, error } = existente
			? await this.clienteSupabase.cliente
					.from('recompensas')
					.update(datos)
					.eq('id', existente.id)
					.select(CAMPOS_RECOMPENSA)
					.single()
			: await this.clienteSupabase.cliente
					.from('recompensas')
					.insert(datos)
					.select(CAMPOS_RECOMPENSA)
					.single();

		if (error) {
			throw new Error(`No se pudo guardar la recompensa del producto: ${error.message}`);
		}
		return data as Recompensa;
	}

	/** Elimina la recompensa de un producto, si tiene una asociada. Pensado para usarse antes de borrar el producto. */
	async eliminarPorProducto(productoId: string): Promise<void> {
		const existente = await this.obtenerPorProducto(productoId);
		if (existente) {
			await this.eliminar(existente.id);
		}
	}

	/**
	 * Obtiene la recompensa fija de "entrada gratis" (tipo 'entrada').
	 * Si todavía no existe ninguna, crea la única que va a existir en todo el sistema.
	 */
	async obtenerEntradaGratis(): Promise<Recompensa> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('recompensas')
			.select(CAMPOS_RECOMPENSA)
			.eq('tipo', 'entrada')
			.maybeSingle();

		if (error) {
			throw new Error(`No se pudo consultar la recompensa de entrada: ${error.message}`);
		}
		if (data) {
			return data as Recompensa;
		}

		const { data: creada, error: errorCrear } = await this.clienteSupabase.cliente
			.from('recompensas')
			.insert({
				nombre: NOMBRE_ENTRADA_GRATIS,
				tipo: 'entrada',
				producto_id: null,
				costo_puntos: COSTO_INICIAL_ENTRADA,
			})
			.select(CAMPOS_RECOMPENSA)
			.single();

		if (errorCrear) {
			throw new Error(`No se pudo crear la recompensa de entrada: ${errorCrear.message}`);
		}
		return creada as Recompensa;
	}

	/** Actualiza únicamente el costo en puntos de la recompensa de entrada gratis (nunca crea una nueva). */
	async actualizarCostoEntrada(id: string, costoPuntos: number): Promise<Recompensa> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('recompensas')
			.update({ costo_puntos: costoPuntos })
			.eq('id', id)
			.select(CAMPOS_RECOMPENSA)
			.single();

		if (error) {
			throw new Error(`No se pudo actualizar el costo de la entrada: ${error.message}`);
		}
		return data as Recompensa;
	}

	/** Elimina una recompensa por id. Privado: el borrado siempre pasa por `eliminarPorProducto`. */
	private async eliminar(id: string): Promise<void> {
		const { error } = await this.clienteSupabase.cliente.from('recompensas').delete().eq('id', id);
		if (error) {
			throw new Error(`No se pudo eliminar la recompensa: ${error.message}`);
		}
	}
}