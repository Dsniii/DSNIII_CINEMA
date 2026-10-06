import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Perfil } from '../../../core/models/perfil';
import { Perfiles } from '../../../core/services/perfiles';

/** Pantalla con los datos personales del usuario. */
@Component({
  imports: [DatePipe],
  selector: 'app-datos-personales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './datos-personales.css',
  templateUrl: './datos-personales.html',
})
export class DatosPersonales {
  private readonly perfiles = inject(Perfiles);

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /**
   * `fecha_nacimiento` llega como `YYYY-MM-DD`. Se arma la fecha con año/mes/día
   * locales para que la zona horaria no la corra un día hacia atrás.
   */
  protected readonly fechaNacimiento = computed(() => {
    const valor = this.perfil()?.fecha_nacimiento;
    if (!valor) {
      return null;
    }
    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  });

  /** Crédito en pesos argentinos, p. ej. `$ 1.500,00`. */
  protected readonly creditoFormateado = computed(() =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
      Number(this.perfil()?.credito ?? 0),
      
    ),
  );

  constructor() {
    // En el servidor (SSR) no hay sesión de Supabase: se carga solo en el navegador.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      void this.cargar();
    } else {
      this.cargando.set(false);
    }
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.perfil.set(await this.perfiles.obtenerPerfilActual());
    } catch {
      this.error.set('No pudimos cargar tus datos.');
    } finally {
      this.cargando.set(false);
    }
  }
}