import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duracionPelicula',
})
export class DuracionPeliculaPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
