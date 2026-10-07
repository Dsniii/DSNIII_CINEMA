import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { CompraParaReporte } from '../models/reporte-facturacion';
import { ESTADO_COMPRA_FACTURADA, Reportes, TAMANO_LOTE_COMPRAS } from './reportes';

function compra(dia: number, total = 1000): CompraParaReporte {
  return {
    fecha_hora: new Date(2020, 1, dia, 15, 0).toISOString(),
    subtotal: total,
    descuento_cupon: 0,
    credito_utilizado: 0,
    total,
    entradas: [{ count: 2 }],
  };
}

describe('Reportes (servicio)', () => {
  let servicio: Reportes;
  let respuestas: { data: CompraParaReporte[] | null; error: { message: string } | null }[];
  const consulta = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };
  const desde = vi.fn();

  beforeEach(() => {
    respuestas = [];
    for (const metodo of [consulta.select, consulta.eq, consulta.gte, consulta.lt, consulta.order]) {
      metodo.mockReset().mockReturnValue(consulta);
    }
    consulta.range.mockReset().mockImplementation(async () => respuestas.shift());
    desde.mockReset().mockReturnValue(consulta);

    TestBed.configureTestingModule({
      providers: [{ provide: ClienteSupabase, useValue: { cliente: { from: desde } } }],
    });
    servicio = TestBed.inject(Reportes);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('pide solo compras confirmadas del período y arma el reporte', async () => {
    respuestas.push({ data: [compra(28, 2500), compra(28, 1500)], error: null });

    const reporte = await servicio.obtenerFacturacion('2020-02-28', '2020-02-28');

    expect(desde).toHaveBeenCalledWith('compras');
    expect(consulta.eq).toHaveBeenCalledWith('estado', ESTADO_COMPRA_FACTURADA);
    expect(consulta.gte).toHaveBeenCalledWith('fecha_hora', new Date(2020, 1, 28).toISOString());
    expect(consulta.lt).toHaveBeenCalledWith('fecha_hora', new Date(2020, 1, 29).toISOString());
    expect(reporte.totales.facturado).toBe(4000);
    expect(reporte.totales.entradas).toBe(4);
  });

  it('sigue leyendo mientras el lote venga completo', async () => {
    respuestas.push({
      data: Array.from({ length: TAMANO_LOTE_COMPRAS }, () => compra(28, 10)),
      error: null,
    });
    respuestas.push({ data: [compra(28, 10)], error: null });

    const reporte = await servicio.obtenerFacturacion('2020-02-28', '2020-02-28');

    expect(consulta.range).toHaveBeenCalledTimes(2);
    expect(consulta.range).toHaveBeenNthCalledWith(2, TAMANO_LOTE_COMPRAS, TAMANO_LOTE_COMPRAS * 2 - 1);
    expect(reporte.totales.compras).toBe(TAMANO_LOTE_COMPRAS + 1);
  });

  it('propaga el error de la base y rechaza períodos inválidos sin consultar', async () => {
    respuestas.push({ data: null, error: { message: 'permission denied' } });
    await expect(servicio.obtenerFacturacion('2020-02-28', '2020-02-28')).rejects.toThrow(
      /permission denied/,
    );

    desde.mockClear();
    await expect(servicio.obtenerFacturacion('2020-03-01', '2020-02-28')).rejects.toThrow();
    expect(desde).not.toHaveBeenCalled();
  });
});
