import { calcularTotal, categoriaDeButaca, preciosDeFuncion } from './precios-funcion';

describe('precios-funcion', () => {
  const base = { precio_base: 5000, precio_vip: 8000, en_preventa: false, precio_preventa: 4000 };

  it('usa precio base y VIP fuera de preventa', () => {
    expect(preciosDeFuncion(base)).toEqual({ normal: 5000, vip: 8000 });
  });

  it('en preventa el precio de preventa reemplaza a ambos', () => {
    expect(preciosDeFuncion({ ...base, en_preventa: true })).toEqual({ normal: 4000, vip: 4000 });
  });

  it('cobra la butaca accesible como normal', () => {
    expect(categoriaDeButaca('accesible')).toBe('normal');
    expect(categoriaDeButaca('normal')).toBe('normal');
    expect(categoriaDeButaca('vip')).toBe('vip');
  });

  it('acumula el total por categoría', () => {
    expect(calcularTotal({ normal: 2, vip: 1 }, { normal: 5000, vip: 8000 })).toBe(18000);
    expect(calcularTotal({ normal: 0, vip: 0 }, { normal: 5000, vip: 8000 })).toBe(0);
  });

  it('redondea a centavos', () => {
    expect(calcularTotal({ normal: 3, vip: 0 }, { normal: 0.1, vip: 0 })).toBe(0.3);
  });
});
