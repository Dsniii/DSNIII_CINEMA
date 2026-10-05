import { Pipe, PipeTransform } from '@angular/core';

/** Pipe para formatear importes en pesos argentinos (pendiente de implementar). */
@Pipe({
  name: 'monedaArs',
})
export class MonedaArsPipe implements PipeTransform {
  transform(valor: unknown, ...argumentos: unknown[]): unknown {
    return null;
  }
}
