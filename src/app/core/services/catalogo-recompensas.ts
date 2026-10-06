import { Injectable, inject } from '@angular/core';
import { Recompensa } from '../models/recompensa';
import { ClienteSupabase } from './supabase-client';

/** Lectura del catálogo de recompensas canjeables con puntos. */
@Injectable({ providedIn: 'root' })
export class CatalogoRecompensas {
  private readonly supabase = inject(ClienteSupabase);

  /** Recompensas ordenadas de la más barata a la más cara, con su producto y categoría. */
  async listar(): Promise<Recompensa[]> {
    // AJUSTAR: usá acá exactamente la misma línea que en perfiles.ts para obtener el cliente.
    const cliente = this.supabase.cliente;

    // SUPUESTO: existen las claves foráneas recompensas.producto_id → productos
    // y productos.categoria_id → categorias_producto, así PostgREST puede anidar los datos.
    const { data, error } = await cliente
      .from('recompensas')
      .select(
        'id, nombre, tipo, producto_id, costo_puntos, productos(nombre, precio, imagen_path, activo, categorias_producto(nombre))',
      )
      .order('costo_puntos', { ascending: true });
    if (error) {
      throw error;
    }

    return (data ?? []) as unknown as Recompensa[];
  }
}