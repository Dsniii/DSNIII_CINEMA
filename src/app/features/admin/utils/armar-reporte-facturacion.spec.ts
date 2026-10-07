import { CompraParaReporte } from '../models/reporte-facturacion';
import {
  armarReporteFacturacion,
  claveDeDia,
  fechaLocal,
  limitesDelPeriodo,
  validarPeriodo,
} from './armar-reporte-facturacion';

/** Compra de prueba: la fecha se arma en hora local para que el test no dependa de la zona horaria. */
function compra(
  fecha: [number, number, number, number, number],
  parcial: Partial<CompraParaReporte> = {},
): CompraParaReporte {
  const [anio, mes, dia, hora, minuto] = fecha;
  return {
    fecha_hora: new Date(anio, mes - 1, dia, hora, minuto).toISOString(),
    subtotal: 10000,
    descuento_cupon: 0,
    credito_utilizado: 0,
    total: 10000,
    entradas: [{ count: 2 }],
    ...parcial,
  };
}

describe('armarReporteFacturacion', () => {
  it('suma lo facturado y las entradas vendidas de un día', () => {
    const reporte = armarReporteFacturacion(
      [
        compra([2020, 2, 28, 10, 0]),
        compra([2020, 2, 28, 23, 59], { total: 4500.5, subtotal: 5000, descuento_cupon: 499.5, entradas: [{ count: 1 }] }),
      ],
      '2020-02-28',
      '2020-02-28',
    );

    expect(reporte.dias).toHaveLength(1);
    expect(reporte.dias[0]).toEqual({
      fecha: '2020-02-28',
      compras: 2,
      entradas: 3,
      subtotal: 15000,
      descuentos: 499.5,
      credito: 0,
      facturado: 14500.5,
    });
    expect(reporte.totales.facturado).toBe(14500.5);
    expect(reporte.totales.entradas).toBe(3);
  });

  it('incluye los días sin ventas y deja afuera las compras de otros días', () => {
    const reporte = armarReporteFacturacion(
      [
        compra([2020, 2, 27, 23, 59]),
        compra([2020, 2, 28, 0, 0]),
        compra([2020, 3, 1, 0, 0]),
        compra([2020, 3, 2, 12, 0]),
      ],
      '2020-02-28',
      '2020-03-01',
    );

    expect(reporte.dias.map((dia) => dia.fecha)).toEqual(['2020-02-28', '2020-02-29', '2020-03-01']);
    expect(reporte.dias.map((dia) => dia.compras)).toEqual([1, 0, 1]);
    expect(reporte.dias[1].facturado).toBe(0);
    expect(reporte.totales.compras).toBe(2);
    expect(reporte.totales.facturado).toBe(20000);
  });

  it('no arrastra errores de punto flotante al sumar centavos', () => {
    const reporte = armarReporteFacturacion(
      [
        compra([2020, 2, 28, 9, 0], { total: 0.1 }),
        compra([2020, 2, 28, 10, 0], { total: 0.2 }),
      ],
      '2020-02-28',
      '2020-02-28',
    );
    expect(reporte.totales.facturado).toBe(0.3);
  });

  it('acepta importes como texto y compras sin entradas (solo candy)', () => {
    const reporte = armarReporteFacturacion(
      [compra([2020, 2, 28, 9, 0], { total: '2500.00', subtotal: '2500.00', entradas: [{ count: 0 }] }), compra([2020, 2, 28, 9, 5], { total: 100, entradas: null })],
      '2020-02-28',
      '2020-02-28',
    );
    expect(reporte.totales.facturado).toBe(2600);
    expect(reporte.totales.entradas).toBe(0);
  });

  it('rechaza períodos inválidos', () => {
    expect(() => armarReporteFacturacion([], '2020-03-01', '2020-02-28')).toThrow();
  });
});

describe('validarPeriodo', () => {
  it('acepta un período correcto', () => {
    expect(validarPeriodo('2020-02-28', '2020-02-28')).toBeNull();
  });

  it('avisa cuando falta una fecha, están invertidas o el período es demasiado largo', () => {
    expect(validarPeriodo('', '2020-02-28')).toContain('dos fechas');
    expect(validarPeriodo('2020-03-01', '2020-02-28')).toContain('posterior');
    expect(validarPeriodo('2018-01-01', '2020-02-28')).toContain('366');
  });
});

describe('fechaLocal y claveDeDia', () => {
  it('van y vienen sin corrimientos y rechazan días inexistentes', () => {
    expect(claveDeDia(fechaLocal('2020-02-29') as Date)).toBe('2020-02-29');
    expect(fechaLocal('2019-02-29')).toBeNull();
    expect(fechaLocal('28/02/2020')).toBeNull();
  });
});

describe('limitesDelPeriodo', () => {
  it('va de la medianoche del primer día a la medianoche posterior al último', () => {
    const { inicio, fin } = limitesDelPeriodo('2020-02-28', '2020-02-29');
    expect(new Date(inicio).getTime()).toBe(new Date(2020, 1, 28).getTime());
    expect(new Date(fin).getTime()).toBe(new Date(2020, 2, 1).getTime());
  });
});
