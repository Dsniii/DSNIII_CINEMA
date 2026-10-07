import { Pipe, PipeTransform } from '@angular/core';

const OPCIONES = { style: 'currency', currency: 'ARS' } as const;
const FORMATO_ENTERO = new Intl.NumberFormat('es-AR', { ...OPCIONES, maximumFractionDigits: 0 });
const FORMATO_CENTAVOS = new Intl.NumberFormat('es-AR', {
  ...OPCIONES,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un importe en pesos argentinos (`$ 1.500`, con centavos solo si los tiene); vacío si no es un número. */
@Pipe({
  name: 'monedaArs',
})
export class MonedaArsPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      return '';
    }
    return (Number.isInteger(numero) ? FORMATO_ENTERO : FORMATO_CENTAVOS).format(numero);
  }
}
