import { Service, signal } from '@angular/core';
import { SeleccionCompra } from '../models/seleccion-compra';

/** Guarda lo elegido en la selección de butacas para que lo lea el resto de la compra. */
@Service()
export class CompraEnCurso {
  private readonly _seleccion = signal<SeleccionCompra | null>(null);

  /** Selección vigente, o `null` si todavía no se eligió nada. */
  readonly seleccion = this._seleccion.asReadonly();

  /** Guarda la selección (reemplaza la anterior). */
  guardar(seleccion: SeleccionCompra): void {
    this._seleccion.set(seleccion);
  }

  /** Descarta la selección, por ejemplo al terminar o cancelar la compra. */
  limpiar(): void {
    this._seleccion.set(null);
  }
}
