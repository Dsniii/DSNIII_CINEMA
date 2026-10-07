import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { diaLegible } from '../../../core/utils/formato-reporte-facturacion';
import { MonedaArsPipe } from '../../../shared/pipes/moneda-ars-pipe';
import { ReporteFacturacion } from '../models/reporte-facturacion';
import { Reportes as ServicioReportes } from '../servicios/reportes';
import { hoy, validarPeriodo } from '../utils/armar-reporte-facturacion';

type Formato = 'pdf' | 'excel';

/** Pantalla de administración con los reportes. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonedaArsPipe],
  selector: 'app-reportes',
  styleUrl: './reportes.css',
  templateUrl: './reportes.html',
})
export class Reportes {
  private readonly servicio = inject(ServicioReportes);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Primer día del reporte (`AAAA-MM-DD`); por defecto, hoy. */
  protected readonly desde = signal(hoy());
  /** Último día del reporte (`AAAA-MM-DD`); por defecto, hoy. */
  protected readonly hasta = signal(hoy());

  protected readonly reporte = signal<ReporteFacturacion | null>(null);
  protected readonly cargando = signal(false);
  protected readonly exportando = signal<Formato | null>(null);
  protected readonly error = signal<string | null>(null);

  /** Mensaje si el período elegido no se puede consultar; `null` si está bien. */
  protected readonly errorPeriodo = computed(() => validarPeriodo(this.desde(), this.hasta()));
  protected readonly esUnSoloDia = computed(() => this.reporte()?.desde === this.reporte()?.hasta);
  protected readonly puedeExportar = computed(
    () => this.reporte() !== null && !this.cargando() && this.exportando() === null,
  );

  private consultaActual = 0;

  constructor() {
    if (this.esNavegador) {
      void this.generar();
    }
  }

  protected elegirDesde(valor: string): void {
    this.desde.set(valor);
    void this.generar();
  }

  protected elegirHasta(valor: string): void {
    this.hasta.set(valor);
    void this.generar();
  }

  /** Vuelve al reporte de hoy. */
  protected verHoy(): void {
    this.desde.set(hoy());
    this.hasta.set(hoy());
    void this.generar();
  }

  protected diaLegible(fecha: string): string {
    return diaLegible(fecha);
  }

  /** Lee de nuevo la facturación del período elegido. */
  protected async generar(): Promise<void> {
    const consulta = ++this.consultaActual;
    const problema = this.errorPeriodo();
    if (problema) {
      this.reporte.set(null);
      this.error.set(null);
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    try {
      const reporte = await this.servicio.obtenerFacturacion(this.desde(), this.hasta());
      if (consulta === this.consultaActual) {
        this.reporte.set(reporte);
      }
    } catch (error) {
      if (consulta === this.consultaActual) {
        this.reporte.set(null);
        this.error.set(
          error instanceof Error ? error.message : 'No se pudo cargar el reporte de facturación.',
        );
      }
    } finally {
      if (consulta === this.consultaActual) {
        this.cargando.set(false);
      }
    }
  }

  /** Descarga el reporte que se está viendo en PDF o Excel. */
  protected async exportar(formato: Formato): Promise<void> {
    const reporte = this.reporte();
    if (!reporte || !this.puedeExportar()) {
      return;
    }

    this.exportando.set(formato);
    this.error.set(null);

    try {
      if (formato === 'pdf') {
        const { descargarPdfReporteFacturacion } = await import(
          '../../../core/utils/generar-pdf-reporte-facturacion'
        );
        descargarPdfReporteFacturacion(reporte);
      } else {
        const { descargarExcelReporteFacturacion } = await import(
          '../../../core/utils/generar-excel-reporte-facturacion'
        );
        descargarExcelReporteFacturacion(reporte);
      }
    } catch (error) {
      console.error(error);
      this.error.set(`No se pudo generar el archivo ${formato === 'pdf' ? 'PDF' : 'Excel'}.`);
    } finally {
      this.exportando.set(null);
    }
  }
}
