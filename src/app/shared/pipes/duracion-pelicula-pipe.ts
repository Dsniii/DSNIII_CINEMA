import { Pipe, PipeTransform } from '@angular/core';

/** Pipe para mostrar la duración de una película (pendiente de implementar). */
@Pipe({
  name: 'duracionPelicula',
})
export class DuracionPeliculaPipe implements PipeTransform {
  transform(valor: unknown, ...argumentos: unknown[]): unknown {
    return null;
  }
}
