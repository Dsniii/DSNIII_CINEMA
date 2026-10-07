import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Cupon, CuponInput } from '../models/cupon';

/** Columnas a consultar de la tabla cupones. */
const CAMPOS_CUPON =
	'id, codigo, descripcion, porcentaje_descuento, segmento, fecha_inicio, fecha_fin, usos_maximo, activo';

@Injectable({ providedIn: 'root' })
/** Servicio de acceso a datos de cupones. */
export class Cupones {
	constructor(private readonly clienteSupabase: ClienteSupabase) {}

	/** Lista todos los cupones. */
	async listar(): Promise<Cupon[]> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('cupones')
			.select(CAMPOS_CUPON)
			.order('codigo', { ascending: true });

		if (error) throw new Error(`No se pudieron cargar los cupones: ${error.message}`);
		return (data ?? []) as Cupon[];
	}

	/** Busca un cupón por código (sin distinguir mayúsculas). Devuelve `null` si no existe o no es visible. */
	async buscarPorCodigo(codigo: string): Promise<Cupon | null> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('cupones')
			.select(CAMPOS_CUPON)
			.ilike('codigo', codigo.trim().replace(/[%_\\]/g, '\\$&'))
			.maybeSingle();

		if (error) throw new Error(`No se pudo consultar el cupón: ${error.message}`);
		return (data ?? null) as Cupon | null;
	}

	/** Cantidad de compras que ya usaron el cupón. */
	async contarUsos(cuponId: string): Promise<number> {
		const { count, error } = await this.clienteSupabase.cliente
			.from('compras')
			.select('id', { count: 'exact', head: true })
			.eq('cupon_id', cuponId);

		if (error) throw new Error(`No se pudieron contar los usos del cupón: ${error.message}`);
		return count ?? 0;
	}

	/** Crea un cupón. */
	async crear(datos: CuponInput): Promise<Cupon> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('cupones')
			.insert(datos)
			.select(CAMPOS_CUPON)
			.single();

		if (error) throw new Error(`No se pudo crear el cupón: ${error.message}`);
		return data as Cupon;
	}

	/** Actualiza un cupón. */
	async actualizar(id: string, datos: CuponInput): Promise<Cupon> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('cupones')
			.update(datos)
			.eq('id', id)
			.select(CAMPOS_CUPON)
			.single();

		if (error) throw new Error(`No se pudo actualizar el cupón: ${error.message}`);
		return data as Cupon;
	}

	/** Activa o desactiva un cupón. */
	async actualizarEstado(id: string, activo: boolean): Promise<Cupon> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('cupones')
			.update({ activo })
			.eq('id', id)
			.select(CAMPOS_CUPON)
			.single();

		if (error) throw new Error(`No se pudo cambiar el estado del cupón: ${error.message}`);
		return data as Cupon;
	}

	/** Elimina un cupón. */
	async eliminar(id: string): Promise<void> {
		const { error } = await this.clienteSupabase.cliente.from('cupones').delete().eq('id', id);
		if (error) throw new Error(`No se pudo eliminar el cupón: ${error.message}`);
	}
}