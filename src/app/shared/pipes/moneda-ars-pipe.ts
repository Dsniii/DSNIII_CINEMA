import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'monedaArs',
})
export class MonedaArsPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
