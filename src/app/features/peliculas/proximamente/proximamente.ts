import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { PeliculaProxima } from '../models/pelicula';
import { ProximosEstrenos } from '../servicios/proximos-estrenos';

const formatoEstreno = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const formatoDiaMes = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

/** `YYYY-MM-DD` → fecha local (evita que la zona horaria la corra un día). */
function fechaLocal(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Película lista para mostrar. */
interface PeliculaVista {
  nombre: string;
  imagen: string | null;
  estreno: string;
  preventaDisponible: boolean;
  preventaTexto: string;
}

/** Pantalla con los próximos estrenos. */
@Component({
  imports: [],
  selector: 'app-proximamente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './proximamente.css',
  templateUrl: './proximamente.html',
})
export class Proximamente {
  private readonly estrenos = inject(ProximosEstrenos);

  protected readonly peliculas = signal<PeliculaProxima[]>([]);
  protected readonly hoy = signal(this.inicioDeHoy());
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly peliculasVista = computed<PeliculaVista[]>(() => {
    const hoy = this.hoy();

    return this.peliculas().map((pelicula) => {
      const estreno = fechaLocal(pelicula.fecha_estreno);
      const dias = Number(pelicula.dias_preventa ?? 0);

      let preventaDisponible = false;
      let preventaTexto = 'Sin preventa';

      if (dias > 0) {
        const inicioPreventa = new Date(
          estreno.getFullYear(),
          estreno.getMonth(),
          estreno.getDate() - dias,
        );
        if (inicioPreventa <= hoy) {
          preventaDisponible = true;
        } else {
          preventaTexto = `Preventa desde el ${formatoDiaMes.format(inicioPreventa)}`;
        }
      }

      return {
        nombre: pelicula.nombre,
        imagen: pelicula.imagen_path?.trim() || null,
        estreno: formatoEstreno.format(estreno),
        preventaDisponible,
        preventaTexto,
      };
    });
  });

  constructor() {
    // Se carga solo en el navegador para que "hoy" sea el del usuario y no el del servidor.
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
      this.hoy.set(this.inicioDeHoy());
      this.peliculas.set(await this.estrenos.listar());
    } catch {
      this.error.set('No pudimos cargar los próximos estrenos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private inicioDeHoy(): Date {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }
}