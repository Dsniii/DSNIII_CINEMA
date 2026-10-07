import { MonedaArsPipe } from './moneda-ars-pipe';

describe('MonedaArsPipe', () => {
  const pipe = new MonedaArsPipe();

  it('crea una instancia', () => {
    expect(pipe).toBeTruthy();
  });

  it('formatea pesos con separador de miles', () => {
    expect(pipe.transform(15000)).toMatch(/^\$\s?15\.000$/);
  });

  it('acepta números como texto y conserva centavos', () => {
    expect(pipe.transform('1500.5')).toMatch(/^\$\s?1\.500,50$/);
  });

  it('devuelve vacío si no hay un número válido', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('abc')).toBe('');
  });
});
