import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import {
  ESTADO_COMPRA_CONFIRMADA,
  EstadisticasDashboard,
  TAMANO_LOTE_ESTADISTICAS,
} from './estadisticas-dashboard';

describe('EstadisticasDashboard', () => {
  let servicio: EstadisticasDashboard;
  let respuestas: { data: unknown[] | null; error: { message: string } | null }[];
  const consulta = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };
  const desde = vi.fn();

  beforeEach(() => {
    respuestas = [];
    for (const metodo of [consulta.select, consulta.eq, consulta.gte, consulta.order]) {
      metodo.mockReset().mockReturnValue(consulta);
    }
    consulta.range.mockReset().mockImplementation(async () => respuestas.shift());
    desde.mockReset().mockReturnValue(consulta);

    TestBed.configureTestingModule({
      providers: [{ provide: ClienteSupabase, useValue: { cliente: { from: desde } } }],
    });
    servicio = TestBed.inject(EstadisticasDashboard);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('lee las entradas de compras confirmadas con día de compra y película', async () => {
    respuestas.push({
      data: [
        {
          id: '1',
          funciones: { peliculas: { nombre: 'Dune' } },
          compras: { fecha_hora: new Date(2026, 9, 5, 21, 30).toISOString() },
        },
        {
          id: '2',
          funciones: [{ peliculas: [{ nombre: 'Barbie' }] }],
          compras: [{ fecha_hora: new Date(2026, 9, 6, 0, 5).toISOString() }],
        },
        { id: '3', funciones: null, compras: null },
      ],
      error: null,
    });

    const entradas = await servicio.obtenerEntradasVendidas('2025-10-01');

    expect(desde).toHaveBeenCalledWith('entradas');
    expect(consulta.eq).toHaveBeenCalledWith('compras.estado', ESTADO_COMPRA_CONFIRMADA);
    expect(consulta.gte).toHaveBeenCalledWith(
      'compras.fecha_hora',
      new Date(2025, 9, 1).toISOString(),
    );
    expect(entradas).toEqual([
      { fecha: '2026-10-05', pelicula: 'Dune' },
      { fecha: '2026-10-06', pelicula: 'Barbie' },
    ]);
  });

  it('lee las ventas de productos y descarta las filas sin producto', async () => {
    respuestas.push({
      data: [
        { id: '1', cantidad: 2, productos: { id: 'p1', nombre: 'Gaseosa' } },
        { id: '2', cantidad: '3', productos: { id: 'p2', nombre: 'Nachos' } },
        { id: '3', cantidad: 1, productos: null },
      ],
      error: null,
    });

    const ventas = await servicio.obtenerVentasProductos();

    expect(desde).toHaveBeenCalledWith('compra_productos');
    expect(consulta.eq).toHaveBeenCalledWith('compras.estado', ESTADO_COMPRA_CONFIRMADA);
    expect(ventas).toEqual([
      { productoId: 'p1', nombre: 'Gaseosa', cantidad: 2 },
      { productoId: 'p2', nombre: 'Nachos', cantidad: 3 },
    ]);
  });

  it('sigue leyendo mientras el lote venga completo', async () => {
    const fila = { id: 'x', cantidad: 1, productos: { id: 'p', nombre: 'Gaseosa' } };
    respuestas.push({ data: Array.from({ length: TAMANO_LOTE_ESTADISTICAS }, () => fila), error: null });
    respuestas.push({ data: [fila], error: null });

    const ventas = await servicio.obtenerVentasProductos();

    expect(consulta.range).toHaveBeenCalledTimes(2);
    expect(ventas).toHaveLength(TAMANO_LOTE_ESTADISTICAS + 1);
  });

  it('propaga el error de la base', async () => {
    respuestas.push({ data: null, error: { message: 'permission denied' } });
    await expect(servicio.obtenerEntradasVendidas('2025-10-01')).rejects.toThrow(/permission denied/);
  });
});
