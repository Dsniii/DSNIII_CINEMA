import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResultadoValidacion } from '../models/resultado-validacion';
import { ResultadoValidacionTarjeta } from '../resultado-validacion/resultado-validacion';
import { Validacion } from '../servicios/validacion';

/** Pantalla para validar entradas y productos ingresando el código a mano. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResultadoValidacionTarjeta, RouterLink],
  selector: 'app-ingreso-manual',
  styleUrl: './ingreso-manual.css',
  templateUrl: './ingreso-manual.html',
})
export class IngresoManual {
  private readonly validacion = inject(Validacion);

  protected readonly validando = signal(false);
  protected readonly resultado = signal<ResultadoValidacion | null>(null);
  protected readonly errorValidacion = signal<string | null>(null);

  /** Valida el código escrito. Si salió bien, la pantalla queda lista para el siguiente. */
  protected async validar(campo: HTMLInputElement): Promise<void> {
    const codigo = campo.value.trim();
    if (!codigo || this.validando()) {
      return;
    }

    this.validando.set(true);
    this.resultado.set(null);
    this.errorValidacion.set(null);

    try {
      const resultado = await this.validacion.validar(codigo);
      this.resultado.set(resultado);
      if (resultado.resultado === 'validado') {
        campo.value = '';
      }
    } catch (error) {
      this.errorValidacion.set(error instanceof Error ? error.message : 'No se pudo validar el código.');
    } finally {
      this.validando.set(false);
    }
  }
}