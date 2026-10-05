import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { CategoriaProducto } from '../models/categoria';
import { Producto, ProductoInput } from '../models/producto';

/** Columnas a consultar de la tabla productos. */
const CAMPOS_PRODUCTO = 'id, nombre, categoria_id, precio, imagen_path, activo';

@Injectable({ providedIn: 'root' })
/** Servicio de acceso a datos de productos y categorías de candy. */
export class Productos {
	constructor(private readonly clienteSupabase: ClienteSupabase) {}

	/** Lista todos los productos. */
	async listar(): Promise<Producto[]> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('productos')
			.select(CAMPOS_PRODUCTO)
			.order('nombre', { ascending: true });

		if (error) {
			throw new Error(`No se pudieron cargar los productos: ${error.message}`);
		}

		return (data ?? []) as Producto[];
	}

	/** Lista las categorías de producto. */
	async listarCategorias(): Promise<CategoriaProducto[]> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('categorias_producto')
			.select('id, nombre')
			.order('nombre', { ascending: true });

		if (error) {
			throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
		}

		return (data ?? []) as CategoriaProducto[];
	}

	/** Crea un producto. */
	async crear(datos: ProductoInput): Promise<Producto> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('productos')
			.insert(datos)
			.select(CAMPOS_PRODUCTO)
			.single();

		if (error) {
			throw new Error(`No se pudo crear el producto: ${error.message}`);
		}

		return data as Producto;
	}

	/** Actualiza un producto. */
	async actualizar(id: string, datos: ProductoInput): Promise<Producto> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('productos')
			.update(datos)
			.eq('id', id)
			.select(CAMPOS_PRODUCTO)
			.single();

		if (error) {
			throw new Error(`No se pudo actualizar el producto: ${error.message}`);
		}

		return data as Producto;
	}

	/** Activa o desactiva un producto. */
	async actualizarEstado(id: string, activo: boolean): Promise<Producto> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('productos')
			.update({ activo })
			.eq('id', id)
			.select(CAMPOS_PRODUCTO)
			.single();

		if (error) {
			throw new Error(`No se pudo cambiar el estado del producto: ${error.message}`);
		}

		return data as Producto;
	}

	/** Elimina un producto. */
	async eliminar(id: string): Promise<void> {
		const { error } = await this.clienteSupabase.cliente.from('productos').delete().eq('id', id);

		if (error) {
			throw new Error(`No se pudo eliminar el producto: ${error.message}`);
		}
	}

	/** Crea una categoría de producto. */
	async crearCategoria(nombre: string): Promise<CategoriaProducto> {
		const { data, error } = await this.clienteSupabase.cliente
			.from('categorias_producto')
			.insert({ nombre })
			.select('id, nombre')
			.single();

		if (error) {
			throw new Error(`No se pudo crear la categoría: ${error.message}`);
		}

		return data as CategoriaProducto;
	}

	/** Elimina una categoría de producto. */
	async eliminarCategoria(id: string): Promise<void> {
		const { error } = await this.clienteSupabase.cliente
			.from('categorias_producto')
			.delete()
			.eq('id', id);

		if (error) {
			throw new Error(`No se pudo eliminar la categoría: ${error.message}`);
		}
	}
}
