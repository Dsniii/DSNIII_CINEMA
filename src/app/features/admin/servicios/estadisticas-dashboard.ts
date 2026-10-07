import { Service, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { EntradaVista, VentaProducto } from '../models/estadisticas-dashboard';
import { claveDeDia, fechaLocal } from '../utils/armar-reporte-facturacion';

/** Estado con el que `confirmar_compra` guarda las compras cobradas; las demás no cuentan. */
export const ESTADO_COMPRA_CONFIRMADA = 'confirmada';
/** Filas por consulta (Supabase corta en 1000 por defecto). */
export const TAMANO_LOTE_ESTADISTICAS = 1000;

/** Respuesta de una página de resultados. */
interface Pagina {
  data: unknown[] | null;
  error: { message: string } | null;
}

/** Un registro embebido de a uno puede llegar como objeto o como lista de un elemento. */
function unico<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }
  return valor ?? null;
}

interface FilaEntrada {
  funciones: unknown;
  compras: unknown;
}
interface FilaProducto {
  cantidad: number | string;
  productos: unknown;
}

/** Lecturas para las estadísticas del dashboard de administración. */
@Service()
export class EstadisticasDashboard {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Entradas vendidas en compras confirmadas desde el día `desde` (`AAAA-MM-DD`, hora local),
   * con el día de la compra y el nombre de la película.
   */
  async obtenerEntradasVendidas(desde: string): Promise<EntradaVista[]> {
    const inicio = fechaLocal(desde);
    if (!inicio) {
      throw new Error('La fecha de inicio de las estadísticas no es válida.');
    }

    const filas = await this.leerTodo<FilaEntrada>(
      (primero, ultimo) =>
        this.supabase
          .from('entradas')
          .select('id, funciones!inner(peliculas(nombre)), compras!inner(estado, fecha_hora)')
          .eq('compras.estado', ESTADO_COMPRA_CONFIRMADA)
          .gte('compras.fecha_hora', inicio.toISOString())
          .order('id', { ascending: true })
          .range(primero, ultimo) as unknown as PromiseLike<Pagina>,
      'las entradas vendidas',
    );

    const entradas: EntradaVista[] = [];
    for (const fila of filas) {
      const funcion = unico(fila.funciones) as { peliculas?: unknown } | null;
      const compra = unico(fila.compras) as { fecha_hora?: string } | null;
      const pelicula = unico(funcion?.peliculas) as { nombre?: string } | null;
      const momento = compra?.fecha_hora ? new Date(compra.fecha_hora) : null;
      if (momento && !Number.isNaN(momento.getTime())) {
        entradas.push({
          fecha: claveDeDia(momento),
          pelicula: pelicula?.nombre ?? 'Película sin nombre',
        });
      }
    }
    return entradas;
  }

  /** Productos del candy bar comprados con dinero en compras confirmadas (los combos no se incluyen). */
  async obtenerVentasProductos(): Promise<VentaProducto[]> {
    const filas = await this.leerTodo<FilaProducto>(
      (primero, ultimo) =>
        this.supabase
          .from('compra_productos')
          .select('id, cantidad, productos!inner(id, nombre), compras!inner(estado)')
          .eq('compras.estado', ESTADO_COMPRA_CONFIRMADA)
          .order('id', { ascending: true })
          .range(primero, ultimo) as unknown as PromiseLike<Pagina>,
      'las ventas del candy bar',
    );

    const ventas: VentaProducto[] = [];
    for (const fila of filas) {
      const producto = unico(fila.productos) as { id?: string; nombre?: string } | null;
      if (producto?.id) {
        ventas.push({
          productoId: producto.id,
          nombre: producto.nombre ?? 'Producto sin nombre',
          cantidad: Number(fila.cantidad),
        });
      }
    }
    return ventas;
  }

  /** Lee todas las páginas de una consulta mientras vengan completas. */
  private async leerTodo<T>(
    pedir: (primero: number, ultimo: number) => PromiseLike<Pagina>,
    queSeLee: string,
  ): Promise<T[]> {
    const filas: T[] = [];

    for (let primero = 0; ; primero += TAMANO_LOTE_ESTADISTICAS) {
      const { data, error } = await pedir(primero, primero + TAMANO_LOTE_ESTADISTICAS - 1);
      if (error) {
        throw new Error(`No se pudo cargar ${queSeLee}: ${error.message}`);
      }
      const lote = (data ?? []) as T[];
      filas.push(...lote);
      if (lote.length < TAMANO_LOTE_ESTADISTICAS) {
        break;
      }
    }

    return filas;
  }
}
