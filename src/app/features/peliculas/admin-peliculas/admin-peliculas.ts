import { DatePipe } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Genero, Pelicula, PeliculaInput, Peliculas } from '../servicios/peliculas';

/** Filtro de estado del listado de películas. */
type FiltroPeliculas = 'todas' | 'activas' | 'inactivas';

/** Valores editables del formulario de película. */
interface FormularioPelicula {
  nombre: string;
  sinopsis: string;
  imagen_path: string;
  duracion_minutos: number;
  restriccion_edad: number;
  fecha_estreno: string;
  dias_preventa: number;
  activa: boolean;
  generoIds: string[];
}

/** Pantalla de administración de películas: alta, edición y baja lógica. */
@Component({
  imports: [DatePipe, FormsModule],
  selector: 'app-admin-peliculas',
  styleUrl: './admin-peliculas.css',
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  constructor(private readonly servicioPeliculas: Peliculas) {}

  readonly peliculas = signal<Pelicula[]>([]);
  readonly generos = signal<Genero[]>([]);
  readonly busqueda = signal('');
  readonly filtro = signal<FiltroPeliculas>('todas');
  /** Id de la película en edición, o null si se está creando una. */
  readonly idEnEdicion = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  /** Id de la película cuyo estado se está cambiando. */
  readonly idCambiandoEstado = signal<number | string | null>(null);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly formulario: FormularioPelicula = this.formularioVacio();

  /** Películas filtradas por texto y estado. */
  readonly peliculasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase();
    const filtro = this.filtro();

    return this.peliculas().filter((pelicula) => {
      const coincideNombre = pelicula.nombre.toLocaleLowerCase().includes(termino);
      const coincideEstado =
        filtro === 'todas' || (filtro === 'activas' ? pelicula.activa : !pelicula.activa);
      return coincideNombre && coincideEstado;
    });
  });

  ngOnInit(): void {
    void this.cargarPeliculas();
  }

  /** Carga películas y géneros desde el servicio. */
  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const [peliculas, generos] = await Promise.all([
        this.servicioPeliculas.listar(),
        this.servicioPeliculas.listarGeneros(),
      ]);
      this.peliculas.set(peliculas);
      this.generos.set(generos);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Ocurrió un error al cargar las películas.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

/** Carga una película en el formulario para editarla. */
  editar(pelicula: Pelicula): void {
    this.idEnEdicion.set(pelicula.id);
    Object.assign(this.formulario, {
      ...pelicula,
      sinopsis: pelicula.sinopsis ?? '',
      imagen_path: pelicula.imagen_path ?? '',
      generoIds: pelicula.generos.map((genero) => genero.id),
    });
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Limpia el formulario para crear una película. */
  nuevaPelicula(): void {
    this.idEnEdicion.set(null);
    Object.assign(this.formulario, this.formularioVacio());
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Valida y guarda la película y sus géneros. */
  async guardar(): Promise<void> {
    if (this.guardando()) {
      return;
    }

    const nombre = this.formulario.nombre.trim();
    if (!nombre) {
      this.error.set('El nombre de la película es obligatorio.');
      return;
    }

    const datos: PeliculaInput = {
      nombre,
      sinopsis: this.formulario.sinopsis.trim() || null,
      imagen_path: this.formulario.imagen_path.trim() || null,
      duracion_minutos: Number(this.formulario.duracion_minutos),
      restriccion_edad: Number(this.formulario.restriccion_edad),
      fecha_estreno: this.formulario.fecha_estreno,
      dias_preventa: Number(this.formulario.dias_preventa),
      activa: this.formulario.activa,
    };

    if (
      !Number.isInteger(datos.duracion_minutos) ||
      datos.duracion_minutos < 1 ||
      !Number.isInteger(datos.restriccion_edad) ||
      datos.restriccion_edad < 0 ||
      !Number.isInteger(datos.dias_preventa) ||
      datos.dias_preventa < 0 ||
      !datos.fecha_estreno
    ) {
      this.error.set('Revisá duración, edad, fecha de estreno y días de preventa.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const id = this.idEnEdicion();
      const peliculaBase =
        id === null
          ? await this.servicioPeliculas.crear(datos)
          : await this.servicioPeliculas.actualizar(id, datos);
      const generoIds = [...this.formulario.generoIds];

      try {
        await this.servicioPeliculas.reemplazarGeneros(peliculaBase.id, generoIds);
      } catch (error) {
        await this.cargarPeliculas();
        throw new Error(
          `Los datos se guardaron, pero no se pudieron actualizar los géneros: ${error instanceof Error ? error.message : 'error desconocido'}`,
        );
      }

      const pelicula: Pelicula = {
        ...peliculaBase,
        generos: this.generos().filter((genero) => generoIds.includes(genero.id)),
      };

      this.peliculas.update((peliculas) => {
        if (id === null) {
          return [...peliculas, pelicula];
        }
        return peliculas.map((elemento) => (elemento.id === pelicula.id ? pelicula : elemento));
      });
      this.nuevaPelicula();
      this.mensaje.set(id === null ? 'Película creada.' : 'Película actualizada.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar la película.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Da de baja o reactiva una película previa confirmación. */
  async cambiarEstado(pelicula: Pelicula): Promise<void> {
    if (this.idCambiandoEstado() !== null) {
      return;
    }

    const accion = pelicula.activa ? 'dar de baja' : 'reactivar';
    if (!window.confirm(`¿Querés ${accion} “${pelicula.nombre}”?`)) {
      return;
    }

    this.idCambiandoEstado.set(pelicula.id);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const actualizada = await this.servicioPeliculas.actualizarEstado(
        pelicula.id,
        !pelicula.activa,
      );
      this.peliculas.update((peliculas) =>
        peliculas.map((elemento) => (elemento.id === actualizada.id ? actualizada : elemento)),
      );
      this.mensaje.set(actualizada.activa ? 'Película reactivada.' : 'Película dada de baja.');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo cambiar el estado de la película.',
      );
    } finally {
      this.idCambiandoEstado.set(null);
    }
  }

  /** Agrega o quita un género del formulario. */
  alternarGenero(generoId: string, seleccionado: boolean): void {
    const ids = new Set(this.formulario.generoIds);
    if (seleccionado) {
      ids.add(generoId);
    } else {
      ids.delete(generoId);
    }
    this.formulario.generoIds = [...ids];
  }

  /** Valores iniciales del formulario. */
  private formularioVacio(): FormularioPelicula {
    return {
      nombre: '',
      sinopsis: '',
      imagen_path: '',
      duracion_minutos: 0,
      restriccion_edad: 0,
      fecha_estreno: '',
      dias_preventa: 0,
      activa: true,
      generoIds: [],
    };
  }
}
