import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { Funcion } from '../models/funcion';
import { Funciones } from '../servicios/funciones';
import { Salas as ServicioSalas } from '../servicios/salas';

/** Sala mostrada en la gestión. */
interface Sala {
  id: number | string;
  nombre: string;
}

/** Grupo de filas contiguas con la misma distribución de butacas. */
interface GrupoFilas {
  etiqueta: string;
  cantidadFilas: number;
  butacasIzquierda: number;
  butacasCentro: number;
  butacasDerecha: number;
  tipo: 'normal' | 'accesible' | 'vip';
  detalle: string;
}

/** Fila del mapa con sus butacas numeradas por bloque (izquierda, centro, derecha). */
interface FilaButacas {
  numero: number;
  letra: string;
  tipo: GrupoFilas['tipo'];
  bloquesButacas: number[][];
}

/** Distribución fija de filas y butacas de cada sala. */
const DISTRIBUCION_FILAS: GrupoFilas[] = [
  {
    etiqueta: 'Filas A–I',
    cantidadFilas: 9,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'normal',
    detalle: '9 filas',
  },
  {
    etiqueta: 'Fila J',
    cantidadFilas: 1,
    butacasIzquierda: 2,
    butacasCentro: 10,
    butacasDerecha: 2,
    tipo: 'accesible',
    detalle: 'Accesible',
  },
  {
    etiqueta: 'Fila K',
    cantidadFilas: 1,
    butacasIzquierda: 2,
    butacasCentro: 10,
    butacasDerecha: 2,
    tipo: 'accesible',
    detalle: 'Accesible',
  },
  {
    etiqueta: 'Filas L–Q',
    cantidadFilas: 6,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'normal',
    detalle: '6 filas',
  },
  {
    etiqueta: 'Filas R–T',
    cantidadFilas: 3,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'vip',
    detalle: 'VIP · 3',
  },
];

/** Pantalla para listar, crear, renombrar y eliminar salas, y ver sus funciones. */
@Component({
  imports: [FormsModule],
  selector: 'app-gestion-salas',
  styleUrl: './gestion-salas.css',
  templateUrl: './gestion-salas.html',
})
export class GestionSalas implements OnInit {
  constructor(
    private readonly servicioSalas: ServicioSalas,
    private readonly servicioFunciones: Funciones,
    private readonly servicioPeliculas: Peliculas,
  ) {}

  /** Distribución de filas que se muestra en pantalla. */
  readonly distribucion = DISTRIBUCION_FILAS;
  readonly salas = signal<Sala[]>([]);
  /** Funciones de la sala seleccionada. */
  readonly funcionesSala = signal<Funcion[]>([]);
  /** Nombre de cada película indexado por su id. */
  readonly nombresPeliculas = signal<Map<string, string>>(new Map());
  readonly salaSeleccionadaId = signal<number | string | null>(null);
  readonly nombreSala = signal('');
  readonly cargandoSalas = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly cargandoFunciones = signal(false);
  readonly errorFunciones = signal<string | null>(null);
  readonly errorPeliculas = signal<string | null>(null);
  readonly creandoSala = signal(false);
  readonly errorCreacion = signal<string | null>(null);
  readonly guardandoSala = signal(false);
  readonly errorEdicion = signal<string | null>(null);
  readonly eliminandoSala = signal(false);
  readonly errorEliminacion = signal<string | null>(null);
  readonly salaSeleccionada = computed(() =>
    this.salas().find((sala) => sala.id === this.salaSeleccionadaId()),
  );
  readonly totalFilas = computed(() =>
    this.distribucion.reduce((total, grupo) => total + grupo.cantidadFilas, 0),
  );
  readonly totalButacas = computed(() =>
    this.distribucion.reduce(
      (total, grupo) =>
        total +
        (grupo.butacasIzquierda + grupo.butacasCentro + grupo.butacasDerecha) * grupo.cantidadFilas,
      0,
    ),
  );
  /** Mapa visual de butacas; las filas accesibles (10 y 11) se muestran primero. */
  readonly mapaButacas = computed<FilaButacas[]>(() => {
    const numerosFilas = Array.from({ length: this.totalFilas() }, (_, indice) => indice + 1);
    const ordenVisual = [
      ...numerosFilas.filter((numero) => numero === 10 || numero === 11),
      ...numerosFilas.filter((numero) => numero !== 10 && numero !== 11),
    ];

    return ordenVisual.map((numero) => {
      const accesible = numero === 10 || numero === 11;
      const vip = numero >= 18;
      let siguienteButaca = 1;
      const cantidadesBloques = accesible ? [2, 10, 2] : [4, 20, 4];

      return {
        numero,
        letra: String.fromCharCode(64 + numero),
        tipo: accesible ? 'accesible' : vip ? 'vip' : 'normal',
        bloquesButacas: cantidadesBloques.map((cantidad) =>
          Array.from({ length: cantidad }, () => siguienteButaca++),
        ),
      };
    });
  });
  /** Permite guardar si el nombre cambió y no repite el de otra sala. */
  readonly puedeGuardar = computed(() => {
    const sala = this.salaSeleccionada();
    const nombre = this.nombreSala().trim();

    return Boolean(
      sala &&
      nombre &&
      nombre !== sala.nombre &&
      !this.salas().some(
        (otraSala) =>
          otraSala.id !== sala.id &&
          otraSala.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase(),
      ),
    );
  });

  /** Descarta respuestas viejas cuando se cambia de sala rápidamente. */
  private secuenciaCargaFunciones = 0;

  ngOnInit(): void {
    void this.cargarSalas();
    void this.cargarNombresPeliculas();
  }

  /** Carga las salas y selecciona la primera. */
  async cargarSalas(): Promise<void> {
    this.cargandoSalas.set(true);
    this.errorCarga.set(null);

    try {
      const salas = await this.servicioSalas.listarSalas();

      this.salas.set(salas);

      if (salas.length > 0) {
        this.seleccionarSala(salas[0]);
      } else {
        this.salaSeleccionadaId.set(null);
        this.nombreSala.set('');
      }
    } catch (error) {
      this.errorCarga.set(
        error instanceof Error ? error.message : 'Ocurrió un error al cargar las salas.',
      );
    } finally {
      this.cargandoSalas.set(false);
    }
  }

  /** Selecciona una sala y carga sus funciones. */
  seleccionarSala(sala: Sala): void {
    this.salaSeleccionadaId.set(sala.id);
    this.nombreSala.set(sala.nombre);
    void this.cargarFuncionesSala(sala.id);
  }

  /** Carga las funciones programadas de una sala. */
  async cargarFuncionesSala(salaId: number | string): Promise<void> {
    const secuencia = ++this.secuenciaCargaFunciones;
    this.funcionesSala.set([]);
    this.cargandoFunciones.set(true);
    this.errorFunciones.set(null);

    try {
      const funciones = await this.servicioFunciones.listarPorSala(salaId);
      if (secuencia === this.secuenciaCargaFunciones && this.salaSeleccionadaId() === salaId) {
        this.funcionesSala.set(funciones);
      }
    } catch (error) {
      if (secuencia === this.secuenciaCargaFunciones && this.salaSeleccionadaId() === salaId) {
        this.errorFunciones.set(
          error instanceof Error ? error.message : 'Ocurrió un error al cargar las funciones.',
        );
      }
    } finally {
      if (secuencia === this.secuenciaCargaFunciones) {
        this.cargandoFunciones.set(false);
      }
    }
  }

  /** Carga los nombres de películas para mostrarlos en las funciones. */
  async cargarNombresPeliculas(): Promise<void> {
    this.errorPeliculas.set(null);

    try {
      const peliculas = await this.servicioPeliculas.listarNombres();
      this.nombresPeliculas.set(
        new Map(peliculas.map((pelicula) => [pelicula.id, pelicula.nombre])),
      );
    } catch (error) {
      this.errorPeliculas.set(
        error instanceof Error ? error.message : 'Ocurrió un error al cargar las películas.',
      );
    }
  }

  /** Devuelve el nombre de la película o un texto por defecto. */
  nombrePelicula(peliculaId: string): string {
    return this.nombresPeliculas().get(peliculaId) ?? 'Película no disponible';
  }

  /** Convierte AAAA-MM-DD a DD/MM/AAAA. */
  fechaFuncion(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  /** Crea una sala con el primer nombre "Sala N" libre. */
  async crearSala(): Promise<void> {
    if (this.creandoSala()) {
      return;
    }

    let numeroSala = 1;
    while (this.salas().some((sala) => sala.nombre === `Sala ${numeroSala}`)) {
      numeroSala += 1;
    }

    this.creandoSala.set(true);
    this.errorCreacion.set(null);

    try {
      const salaCreada = await this.servicioSalas.crearSalaConButacas(`Sala ${numeroSala}`);
      const nuevaSala: Sala = { ...salaCreada };

      this.salas.update((salas) => [...salas, nuevaSala]);
      this.seleccionarSala(nuevaSala);
    } catch (error) {
      this.errorCreacion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al crear la sala.',
      );
    } finally {
      this.creandoSala.set(false);
    }
  }

  /** Guarda el nuevo nombre de la sala seleccionada. */
  async guardarSala(): Promise<void> {
    const sala = this.salaSeleccionada();
    const nombre = this.nombreSala().trim();

    if (!sala || !this.puedeGuardar() || this.guardandoSala() || this.eliminandoSala()) {
      return;
    }

    this.guardandoSala.set(true);
    this.errorEdicion.set(null);

    try {
      const salaActualizada = await this.servicioSalas.actualizarNombreSala(sala.id, nombre);
      this.salas.update((salas) =>
        salas.map((elemento) => (elemento.id === sala.id ? { ...elemento, ...salaActualizada } : elemento)),
      );
      this.nombreSala.set(salaActualizada.nombre);
    } catch (error) {
      this.errorEdicion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al guardar la sala.',
      );
    } finally {
      this.guardandoSala.set(false);
    }
  }

  /** Elimina la sala seleccionada tras confirmar. */
  async eliminarSala(): Promise<void> {
    const sala = this.salaSeleccionada();

    if (
      !sala ||
      this.guardandoSala() ||
      this.eliminandoSala() ||
      !window.confirm(`¿Eliminar ${sala.nombre} y todas sus butacas?`)
    ) {
      return;
    }

    this.eliminandoSala.set(true);
    this.errorEliminacion.set(null);

    try {
      await this.servicioSalas.eliminarSalaConButacas(sala.id);
      const salasRestantes = this.salas().filter((elemento) => elemento.id !== sala.id);
      this.salas.set(salasRestantes);

      if (salasRestantes.length > 0) {
        this.seleccionarSala(salasRestantes[0]);
      } else {
        this.secuenciaCargaFunciones += 1;
        this.salaSeleccionadaId.set(null);
        this.nombreSala.set('');
        this.funcionesSala.set([]);
        this.cargandoFunciones.set(false);
        this.errorFunciones.set(null);
      }
    } catch (error) {
      this.errorEliminacion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al eliminar la sala.',
      );
    } finally {
      this.eliminandoSala.set(false);
    }
  }

  /** Texto con las butacas por bloque, ej. "4 · 20 · 4". */
  filasDescripcion(grupo: GrupoFilas): string {
    return `${grupo.butacasIzquierda} · ${grupo.butacasCentro} · ${grupo.butacasDerecha}`;
  }
}
