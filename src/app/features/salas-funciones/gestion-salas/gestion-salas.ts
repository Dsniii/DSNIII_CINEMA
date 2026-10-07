import { isPlatformBrowser } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReservasEnVivo, ReservasTemporales } from '../../compra/servicios/reservas-temporales';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { Butaca } from '../models/butaca';
import { Funcion } from '../models/funcion';
import { Butacas } from '../servicios/butacas';
import { Funciones } from '../servicios/funciones';
import { Salas as ServicioSalas } from '../servicios/salas';

/** Estado de una butaca en la función elegida. */
export type EstadoButaca = 'libre' | 'reservada' | 'vendida';

/** Cada cuánto se refresca el reloj que da por vencidas las reservas temporales. */
const INTERVALO_RELOJ_MS = 5000;
/** Cada cuántos ticks del reloj se vuelve a leer la base (por si se perdió alguna baja en vivo). */
const TICKS_RECARGA = 3;
/** Una reserva con vencimiento en este año o después es una compra confirmada (nunca vence). */
const INICIO_SIN_VENCIMIENTO = Date.parse('9999-01-01T00:00:00Z');

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
    private readonly servicioButacas: Butacas,
    private readonly servicioReservas: ReservasTemporales,
  ) {
    // El reloj y la conexión en vivo solo existen en el navegador.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      let ticks = 0;
      const reloj = setInterval(() => {
        this.ahora.set(Date.now());
        ticks += 1;
        if (ticks % TICKS_RECARGA === 0) {
          void this.enVivo()?.recargar();
        }
      }, INTERVALO_RELOJ_MS);
      inject(DestroyRef).onDestroy(() => {
        clearInterval(reloj);
        this.enVivo()?.cerrar();
      });
    }
  }

  /** Distribución de filas que se muestra en pantalla. */
  readonly distribucion = DISTRIBUCION_FILAS;
  readonly salas = signal<Sala[]>([]);
  /** Funciones de la sala seleccionada. */
  readonly funcionesSala = signal<Funcion[]>([]);
  /** Nombre de cada película indexado por su id. */
  readonly nombresPeliculas = signal<Map<string, string>>(new Map());
  readonly salaSeleccionadaId = signal<number | string | null>(null);
  /** Función elegida para ver la ocupación de butacas (o `null`). */
  readonly funcionSeleccionadaId = signal<string | null>(null);
  /** Butacas reales de la sala seleccionada (para cruzarlas con las reservas). */
  private readonly butacasSala = signal<Butaca[]>([]);
  private readonly enVivo = signal<ReservasEnVivo | null>(null);
  private readonly ahora = signal(Date.now());
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
  readonly funcionSeleccionada = computed(() =>
    this.funcionesSala().find((funcion) => funcion.id === this.funcionSeleccionadaId()),
  );
  /** `true` mientras llegan en vivo los cambios de reservas. */
  readonly conectado = computed(() => this.enVivo()?.conectado() ?? false);
  /** Estado de cada butaca de la función elegida, indexado por `fila-columna`. */
  readonly estadosButacas = computed(() => {
    const estados = new Map<string, EstadoButaca>();
    if (!this.funcionSeleccionada()) {
      return estados;
    }

    const clavePorId = new Map(this.butacasSala().map((b) => [b.id, `${b.fila}-${b.columna}`]));
    const ahora = this.ahora();
    for (const reserva of this.enVivo()?.reservas() ?? []) {
      const clave = clavePorId.get(reserva.butaca_id);
      if (!clave) {
        continue;
      }
      const vencimiento = Date.parse(reserva.expira_en);
      if (vencimiento >= INICIO_SIN_VENCIMIENTO) {
        estados.set(clave, 'vendida');
      } else if (vencimiento > ahora) {
        estados.set(clave, 'reservada');
      }
    }
    return estados;
  });
  readonly resumenOcupacion = computed(() => {
    let vendidas = 0;
    let reservadas = 0;
    for (const estado of this.estadosButacas().values()) {
      if (estado === 'vendida') {
        vendidas += 1;
      } else {
        reservadas += 1;
      }
    }
    return { vendidas, reservadas, libres: this.totalButacas() - vendidas - reservadas };
  });
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

  /** Selecciona una sala y carga sus funciones y butacas. */
  seleccionarSala(sala: Sala): void {
    this.limpiarFuncion();
    this.salaSeleccionadaId.set(sala.id);
    this.nombreSala.set(sala.nombre);
    void this.cargarFuncionesSala(sala.id);
    void this.cargarButacasSala(sala.id);
  }

  /** Elige una función para ver su ocupación en vivo; volver a tocarla la deselecciona. */
  seleccionarFuncion(funcion: Funcion): void {
    if (this.funcionSeleccionadaId() === funcion.id) {
      this.limpiarFuncion();
      return;
    }

    this.enVivo()?.cerrar();
    this.funcionSeleccionadaId.set(funcion.id);
    this.ahora.set(Date.now());
    this.enVivo.set(this.servicioReservas.observar(funcion.id));
  }

  /** Estado de la butaca (fila numérica + número de asiento) en la función elegida. */
  estadoButaca(fila: number, numero: number): EstadoButaca {
    return this.estadosButacas().get(`${fila}-${numero}`) ?? 'libre';
  }

  /** Texto del tooltip de una butaca. */
  tituloButaca(letra: string, fila: number, numero: number): string {
    const estado = this.estadoButaca(fila, numero);
    const sufijo = estado === 'vendida' ? ' · vendida' : estado === 'reservada' ? ' · reservada' : '';
    return `Fila ${letra}, butaca ${numero}${sufijo}`;
  }

  /** Cierra la conexión en vivo y deja el mapa sin función elegida. */
  private limpiarFuncion(): void {
    this.enVivo()?.cerrar();
    this.enVivo.set(null);
    this.funcionSeleccionadaId.set(null);
  }

  /** Carga las butacas reales de la sala (descarta respuestas viejas al cambiar rápido de sala). */
  private async cargarButacasSala(salaId: number | string): Promise<void> {
    this.butacasSala.set([]);
    try {
      const butacas = await this.servicioButacas.listarPorSala(String(salaId));
      if (this.salaSeleccionadaId() === salaId) {
        this.butacasSala.set(butacas);
      }
    } catch (error) {
      console.error('Gestión de salas: no se pudieron cargar las butacas', error);
    }
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
        this.limpiarFuncion();
        this.butacasSala.set([]);
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