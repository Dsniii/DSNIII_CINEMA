import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Genero, PeliculaGenero } from '../models/genero';
import { PeliculaCartelera } from '../models/pelicula';
import { Cartelera } from '../servicios/cartelera';

const formatoEstreno = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });

/** `YYYY-MM-DD` → fecha local (evita que la zona horaria la corra un día). */
function fechaLocal(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Minúsculas y sin tildes, para que "ambar" encuentre "Ámbar". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Película lista para mostrar. */
interface PeliculaVista {
  id: string;
  nombre: string;
  imagen: string | null;
  generoIds: string[];
  generosTexto: string;
  enPreventa: boolean;
  estrenoTexto: string;
  restriccion: string | null;
}

/** Pantalla con el listado de películas en cartelera (home). */
@Component({
  imports: [FormsModule, NgTemplateOutlet],
  selector: 'app-listado-peliculas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './listado-peliculas.css',
  templateUrl: './listado-peliculas.html',
})
export class ListadoPeliculas {
  private readonly enrutador = inject(Router);
  private readonly cartelera = inject(Cartelera);

  protected readonly peliculas = signal<PeliculaCartelera[]>([]);
  protected readonly generos = signal<Genero[]>([]);
  protected readonly relaciones = signal<PeliculaGenero[]>([]);
  protected readonly idsMasVendidas = signal<string[]>([]);
  protected readonly hoy = signal(this.inicioDeHoy());

  protected readonly busqueda = signal('');
  protected readonly generoSeleccionado = signal<string | null>(null);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Se pueden comprar las ya estrenadas y las que ya abrieron su preventa. */
  protected readonly disponibles = computed<PeliculaVista[]>(() => {
    const hoy = this.hoy();
    const nombresGenero = new Map(this.generos().map((g) => [g.id, g.nombre]));
    const generosPorPelicula = new Map<string, string[]>();
    for (const relacion of this.relaciones()) {
      const lista = generosPorPelicula.get(relacion.pelicula_id) ?? [];
      lista.push(relacion.genero_id);
      generosPorPelicula.set(relacion.pelicula_id, lista);
    }

    return this.peliculas().flatMap((pelicula) => {
      const estreno = fechaLocal(pelicula.fecha_estreno);
      const diasPreventa = Math.max(Number(pelicula.dias_preventa ?? 0), 0);
      const inicioVenta = new Date(
        estreno.getFullYear(),
        estreno.getMonth(),
        estreno.getDate() - diasPreventa,
      );
      if (inicioVenta > hoy) {
        return [];
      }

      const generoIds = generosPorPelicula.get(pelicula.id) ?? [];
      const edad = Number(pelicula.restriccion_edad ?? 0);

      return [
        {
          id: pelicula.id,
          nombre: pelicula.nombre,
          imagen: pelicula.imagen_path?.trim() || null,
          generoIds,
          generosTexto: generoIds
            .map((id) => nombresGenero.get(id))
            .filter((nombre): nombre is string => !!nombre)
            .join(' · '),
          enPreventa: estreno > hoy,
          estrenoTexto: formatoEstreno.format(estreno),
          restriccion: edad > 0 ? `+${edad}` : null,
        },
      ];
    });
  });

  /** Solo los géneros que tienen al menos una película disponible. */
  protected readonly generosDisponibles = computed(() => {
    const usados = new Set(this.disponibles().flatMap((p) => p.generoIds));
    return this.generos().filter((g) => usados.has(g.id));
  });

  protected readonly filtradas = computed(() => {
    const texto = normalizar(this.busqueda());
    const genero = this.generoSeleccionado();

    return this.disponibles().filter(
      (p) =>
        (!texto || normalizar(p.nombre).includes(texto)) &&
        (!genero || p.generoIds.includes(genero)),
    );
  });

  /** Ranking de las más vendidas, solo con películas que hoy se pueden comprar. */
  protected readonly masVendidas = computed(() => {
    const porId = new Map(this.disponibles().map((p) => [p.id, p]));
    return this.idsMasVendidas()
      .map((id) => porId.get(id))
      .filter((p): p is PeliculaVista => !!p);
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
    this.hoy.set(this.inicioDeHoy());

    const [peliculas, generos, vendidas] = await Promise.allSettled([
      this.cartelera.listarActivas(),
      this.cartelera.listarGeneros(),
      this.cartelera.masVendidas(3),
    ]);

    // Las películas son imprescindibles; géneros y ranking son opcionales:
    // si fallan, la cartelera igual se muestra sin ese bloque.
    if (peliculas.status === 'fulfilled') {
      this.peliculas.set(peliculas.value);
    } else {
      this.error.set('No pudimos cargar la cartelera.');
    }
    if (generos.status === 'fulfilled') {
      this.generos.set(generos.value.generos);
      this.relaciones.set(generos.value.relaciones);
    }
    if (vendidas.status === 'fulfilled') {
      this.idsMasVendidas.set(vendidas.value);
    }

    this.cargando.set(false);
  }

  protected elegirGenero(id: string | null): void {
    this.generoSeleccionado.set(id);
  }

  /** Lleva a la selección de butacas de la película elegida. */
  protected comprar(pelicula: PeliculaVista): void {
    void this.enrutador.navigate(['compra/' + pelicula.id + '/butacas'], {
      queryParams: { pelicula: pelicula.id },
      
      
    });
    console.log('Id de la película:', pelicula.id);
  }

  private inicioDeHoy(): Date {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }
}