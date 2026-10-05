import { MonedaArsPipe } from './moneda-ars-pipe';

describe('MonedaArsPipe', () => {
  it('crea una instancia', () => {
    const pipe = new MonedaArsPipe();
    expect(pipe).toBeTruthy();
  });
});
