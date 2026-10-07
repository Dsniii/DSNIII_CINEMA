import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DatosCanjeEntregado,
  DatosEntradaValidada,
  DatosProductoValidado,
  ResultadoValidacion,
} from '../models/resultado-validacion';

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

/** Convierte `YYYY-MM-DD` en una fecha local legible sin correrla por zona horaria. */
function fechaLocal(valor: string): string {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(anio, mes - 1, dia),
  );
}

/** Tarjeta que muestra el resultado de validar un código (la usan el escáner y el ingreso manual). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-resultado-validacion',
  styleUrl: './resultado-validacion.css',
  templateUrl: './resultado-validacion.html',
})
export class ResultadoValidacionTarjeta {
  readonly resultado = input.required<ResultadoValidacion>();

  protected readonly correcto = computed(() => this.resultado().resultado === 'validado');

  protected readonly titulo = computed(() => {
    const r = this.resultado();
    switch (r.resultado) {
      case 'validado':
        return {
          entrada: 'Entrada validada correctamente',
          canje: 'Canje entregado correctamente',
          producto: 'Producto validado correctamente',
        }[r.tipo ?? 'producto'];
      case 'ya_validado':
        return {
          entrada: 'Esta entrada ya fue validada',
          canje: 'Este canje ya fue entregado',
          producto: 'Este producto ya fue validado',
        }[r.tipo ?? 'producto'];
      case 'no_encontrado':
        return 'Código no encontrado';
      default:
        return 'El código no tiene un formato válido';
    }
  });

  /** Mensaje simbólico de error (solo cuando la validación no se pudo completar). */
  protected readonly mensajeError = computed(() => (this.correcto() ? null : 'Error al validar'));

  protected readonly fecha = computed(() => {
    const valor = this.resultado().fecha_validacion;
    return valor ? formatoFechaHora.format(new Date(valor)) : null;
  });

  protected readonly etiquetaFecha = computed(() =>
    this.resultado().resultado === 'ya_validado' ? 'Validado el' : 'Validado a las',
  );

  protected readonly entrada = computed(() =>
    this.resultado().tipo === 'entrada' ? (this.resultado().datos as DatosEntradaValidada | undefined) : undefined,
  );

  protected readonly canje = computed(() =>
    this.resultado().tipo === 'canje' ? (this.resultado().datos as DatosCanjeEntregado | undefined) : undefined,
  );

  protected readonly producto = computed(() =>
    this.resultado().tipo === 'producto' ? (this.resultado().datos as DatosProductoValidado | undefined) : undefined,
  );

  protected readonly fechaFuncion = computed(() => {
    const e = this.entrada();
    return e ? `${fechaLocal(e.fecha)} · ${e.hora_inicio.slice(0, 5)}` : '';
  });
}