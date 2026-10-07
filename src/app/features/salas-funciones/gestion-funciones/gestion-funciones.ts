import { DatePipe } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pelicula, Peliculas } from '../../peliculas/servicios/peliculas';
import { Funcion, FuncionInput, FormatoFuncion, IdiomaFuncion } from '../models/funcion';
import { AsignadorSala, calcularHoraFin, SalaNoDisponibleError } from '../servicios/asignador-sala';
import { Funciones } from '../servicios/funciones';
import { SalaCreada, Salas } from '../servicios/salas';
import { LogActividad } from '../../admin/servicios/log-actividad';

/** Valores editables del formulario de función. */
interface FormularioFuncion {
  pelicula_id: string;
  sala_id: string;
  fecha: string;
  hora_inicio: string;
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
  precio_base: number;
  precio_vip: number;
  precio_preventa: number;
}

/** Horarios de inicio rápidos para elegir en el formulario. */
const HORARIOS_SUGERIDOS = ['14:00', '16:45', '19:30', '22:00'];

/** Formatea una fecha local como AAAA-MM-DD. */
function fechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/** Suma (o resta) días a una fecha AAAA-MM-DD usando UTC para evitar desfases. */
function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return `${resultado.getUTCFullYear()}-${String(resultado.getUTCMonth() + 1).padStart(2, '0')}-${String(resultado.getUTCDate()).padStart(2, '0')}`;
}

/** Devuelve las fechas del rango que caen en los días elegidos (0 = lunes ... 6 = domingo). */
export function generarFechasRecurrentes(
  fechaInicio: string,
  fechaFin: string,
  diasSeleccionados: number[],
): string[] {
  const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
  const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
  const inicio = Date.UTC(anioInicio, mesInicio - 1, diaInicio);
  const fin = Date.UTC(anioFin, mesFin - 1, diaFin);

  if (!fechaInicio || !fechaFin || inicio > fin) {
    throw new Error('El rango de fechas recurrentes no es válido.');
  }
  if (diasSeleccionados.length === 0) {
    throw new Error('Seleccioná al menos un día de la semana.');
  }

  const dias = new Set(diasSeleccionados);
  const fechas: string[] = [];
  const cursor = new Date(inicio);

  while (cursor.getTime() <= fin) {
    const diaLunesPrimero = (cursor.getUTCDay() + 6) % 7;
    if (dias.has(diaLunesPrimero)) {
      fechas.push(
        `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`,
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (fechas.length === 0) {
    throw new Error('No hay fechas que coincidan con los días seleccionados.');
  }

  return fechas;
}

/** Indica si la fecha actual está dentro de los días de preventa previos al estreno. */
export function estaEnVentanaPreventa(
  fechaActual: string,
  fechaEstreno: string,
  diasPreventa: number,
): boolean {
  if (diasPreventa <= 0) {
    return false;
  }

  const fechaApertura = sumarDias(fechaEstreno, -diasPreventa);
  return fechaActual >= fechaApertura && fechaActual < fechaEstreno;
}

/** Pantalla para listar, crear, editar y eliminar funciones, incluida la programación recurrente. */
@Component({
  imports: [DatePipe, FormsModule],
  selector: 'app-gestion-funciones',
  styleUrl: './gestion-funciones.css',
  templateUrl: './gestion-funciones.html',
})
export class GestionFunciones implements OnInit {
  constructor(
    private readonly servicioFunciones: Funciones,
    private readonly asignadorSala: AsignadorSala,
    private readonly servicioPeliculas: Peliculas,
    private readonly servicioSalas: Salas,
    private readonly servicioLog: LogActividad,
  ) {}

  /** Horarios sugeridos para el formulario. */
  readonly horariosSugeridos = HORARIOS_SUGERIDOS;
  /** Días de la semana; el índice 0 es lunes. */
  readonly diasSemana = [
    { indice: 0, etiqueta: 'Lu' },
    { indice: 1, etiqueta: 'Ma' },
    { indice: 2, etiqueta: 'Mi' },
    { indice: 3, etiqueta: 'Ju' },
    { indice: 4, etiqueta: 'Vi' },
    { indice: 5, etiqueta: 'Sa' },
    { indice: 6, etiqueta: 'Do' },
  ];
  readonly idiomas = [
    { valor: 'castellano' as const, etiqueta: 'Castellano' },
    { valor: 'subtitulada' as const, etiqueta: 'Subtitulada' },
  ];
  readonly funciones = signal<Funcion[]>([]);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly salas = signal<SalaCreada[]>([]);
  /** Filtros de la lista por película y fecha. */
  readonly filtroPelicula = signal('');
  readonly filtroFecha = signal('');
  /** Id de la función en edición, o null si se está creando. */
  readonly idEnEdicion = signal<string | null>(null);
  /** Programación de una fecha única o repetida por días de la semana. */
  readonly tipoProgramacion = signal<'unica' | 'recurrente'>('unica');
  readonly diasSeleccionados = signal<number[]>([]);
  readonly fechaHasta = signal('');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly eliminandoId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  /** Modelo mutable enlazado al formulario. */
  readonly formulario: FormularioFuncion = this.formularioVacio();

  /** Películas activas, más la seleccionada aunque esté inactiva. */
  readonly peliculasDisponibles = () =>
    this.peliculas().filter(
      (pelicula) => pelicula.activa || pelicula.id === this.formulario.pelicula_id,
    );
  readonly peliculaSeleccionada = () =>
    this.peliculas().find((pelicula) => pelicula.id === this.formulario.pelicula_id);
  readonly funcionesFiltradas = computed(() => {
    const peliculaId = this.filtroPelicula();
    const fecha = this.filtroFecha();

    return this.funciones().filter(
      (funcion) =>
        (!peliculaId || funcion.pelicula_id === peliculaId) && (!fecha || funcion.fecha === fecha),
    );
  });
  /** Hora de fin estimada según la duración de la película ("--:--" si no se puede calcular). */
  readonly vistaPreviaHoraFin = () => {
    const duracion = this.peliculaSeleccionada()?.duracion_minutos;
    if (!duracion || !this.formulario.hora_inicio) {
      return '--:--';
    }

    try {
      return calcularHoraFin(this.formulario.hora_inicio, duracion);
    } catch {
      return '--:--';
    }
  };
  /** Fecha en que abre la preventa de la película seleccionada. */
  readonly fechaInicioPreventa = () => {
    const pelicula = this.peliculaSeleccionada();
    return pelicula ? sumarDias(pelicula.fecha_estreno, -pelicula.dias_preventa) : null;
  };
  /** Indica si hoy está abierta la preventa de la película seleccionada. */
  readonly preventaAbierta = () => {
    const pelicula = this.peliculaSeleccionada();
    if (!pelicula) {
      return false;
    }

    return estaEnVentanaPreventa(
      fechaISO(new Date()),
      pelicula.fecha_estreno,
      pelicula.dias_preventa,
    );
  };

  ngOnInit(): void {
    void this.cargarDatos();
  }

  /** Carga funciones, películas y salas, y preselecciona la primera película activa. */
  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const [funciones, peliculas, salas] = await Promise.all([
        this.servicioFunciones.listar(),
        this.servicioPeliculas.listar(),
        this.servicioSalas.listarSalas(),
      ]);
      this.funciones.set(funciones);
      this.peliculas.set(peliculas);
      this.salas.set(salas);

      if (!this.formulario.pelicula_id) {
        const primeraPelicula = peliculas.find((pelicula) => pelicula.activa);
        if (primeraPelicula) {
          this.formulario.pelicula_id = primeraPelicula.id;
        }
      }
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Ocurrió un error al cargar las funciones.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /** Elige la película del formulario. */
  seleccionarPelicula(peliculaId: string): void {
    this.formulario.pelicula_id = peliculaId;
  }

  /** Elige un horario sugerido. */
  seleccionarHorario(hora: string): void {
    this.formulario.hora_inicio = hora;
  }

  /** Agrega o quita un día de la programación recurrente. */
  alternarDiaSemana(indice: number, seleccionado: boolean): void {
    const dias = new Set(this.diasSeleccionados());
    if (seleccionado) {
      dias.add(indice);
    } else {
      dias.delete(indice);
    }
    this.diasSeleccionados.set([...dias].sort((a, b) => a - b));
  }

  /** Reinicia el formulario para crear una función. */
  nuevaFuncion(): void {
    this.idEnEdicion.set(null);
    this.tipoProgramacion.set('unica');
    this.diasSeleccionados.set([]);
    this.fechaHasta.set('');
    Object.assign(this.formulario, this.formularioVacio());
    this.formulario.pelicula_id = this.peliculasDisponibles()[0]?.id ?? '';
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Carga una función en el formulario para editarla. */
  editar(funcion: Funcion): void {
    this.idEnEdicion.set(funcion.id);
    this.tipoProgramacion.set('unica');
    this.diasSeleccionados.set([]);
    this.fechaHasta.set('');
    Object.assign(this.formulario, {
      pelicula_id: funcion.pelicula_id,
      sala_id: funcion.sala_id,
      fecha: funcion.fecha,
      hora_inicio: funcion.hora_inicio.slice(0, 5),
      formato: funcion.formato,
      idioma: funcion.idioma,
      precio_base: funcion.precio_base,
      precio_vip: funcion.precio_vip,
      precio_preventa: funcion.precio_preventa,
    });
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Describe una función para el detalle del log: película, fecha, horario y sala. */
  private describirFuncion(funcion: Funcion, nombrePelicula: string): string {
    const sala = this.salas().find((elemento) => elemento.id === funcion.sala_id)?.nombre ?? 'sala sin asignar';
    return `"${nombrePelicula}" el ${funcion.fecha} ${funcion.hora_inicio.slice(0, 5)}–${funcion.hora_fin.slice(0, 5)} en ${sala} (${funcion.formato}, ${funcion.idioma})`;
  }

  /** Si cambió algún precio de la función, deja constancia de qué valores pasaron a cuáles. */
  private async registrarCambioDePrecio(
    anterior: Funcion,
    nueva: Funcion,
    nombrePelicula: string,
  ): Promise<void> {
    const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
    const cambios = [
      { nombre: 'precio base', antes: anterior.precio_base, ahora: nueva.precio_base },
      { nombre: 'precio VIP', antes: anterior.precio_vip, ahora: nueva.precio_vip },
      { nombre: 'precio de preventa', antes: anterior.precio_preventa, ahora: nueva.precio_preventa },
    ]
      .filter((cambio) => Number(cambio.antes) !== Number(cambio.ahora))
      .map((cambio) => `${cambio.nombre} ${formato.format(Number(cambio.antes))} → ${formato.format(Number(cambio.ahora))}`);

    if (cambios.length === 0) {
      return;
    }

    await this.servicioLog.registrar({
      accion: 'modificar_precio_funcion',
      entidad: 'funciones',
      entidadId: nueva.id,
      detalle: `Modificó el precio de la función ${this.describirFuncion(nueva, nombrePelicula)}: ${cambios.join(', ')}`,
    });
  }

  /** Valida y guarda la función (o una por fecha si es recurrente); la sala se asigna automáticamente. */
  async guardar(): Promise<void> {
    const pelicula = this.peliculaSeleccionada();
    const nombrePelicula = pelicula?.nombre ?? 'la película seleccionada';

    if (this.guardando()) {
      return;
    }
    if (!pelicula || !this.formulario.fecha || !this.formulario.hora_inicio) {
      this.error.set('Seleccioná una película, fecha y hora de inicio.');
      return;
    }

    let fechasProgramadas: string[];
    try {
      fechasProgramadas =
        this.tipoProgramacion() === 'recurrente' && !this.idEnEdicion()
          ? generarFechasRecurrentes(
              this.formulario.fecha,
              this.fechaHasta(),
              this.diasSeleccionados(),
            )
          : [this.formulario.fecha];
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Revisá las fechas recurrentes.');
      return;
    }

    const datos: FuncionInput = {
      pelicula_id: pelicula.id,
      fecha: this.formulario.fecha,
      hora_inicio: this.formulario.hora_inicio,
      formato: this.formulario.formato,
      idioma: this.formulario.idioma,
      precio_base: Number(this.formulario.precio_base),
      precio_vip: Number(this.formulario.precio_vip),
      en_preventa: this.preventaAbierta(),
      precio_preventa: Number(this.formulario.precio_preventa),
    };

    if (
      !Number.isFinite(datos.precio_base) ||
      datos.precio_base < 0 ||
      !Number.isFinite(datos.precio_vip) ||
      datos.precio_vip < 0 ||
      !Number.isFinite(datos.precio_preventa) ||
      datos.precio_preventa < 0
    ) {
      this.error.set('Los precios deben ser números iguales o mayores a cero.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const id = this.idEnEdicion();
      const salaPreferidaId = this.formulario.sala_id || undefined;
      const anterior = id ? this.funciones().find((elemento) => elemento.id === id) : undefined;
      const creadas: Funcion[] = [];
      const fallidas: string[] = [];

      for (const fecha of fechasProgramadas) {
        const datosFecha = { ...datos, fecha };
        try {
          const funcion = id
            ? await this.asignadorSala.actualizar(
                id,
                datosFecha,
                pelicula.duracion_minutos,
                salaPreferidaId,
              )
            : await this.asignadorSala.crear(
                datosFecha,
                pelicula.duracion_minutos,
                salaPreferidaId,
              );
          creadas.push(funcion);

          await this.servicioLog.registrar({
            accion: id ? 'actualizar_funcion' : 'crear_funcion',
            entidad: 'funciones',
            entidadId: funcion.id,
            detalle: `${id ? 'Actualizó la función' : 'Creó la función'} ${this.describirFuncion(funcion, nombrePelicula)}`,
          });

          if (anterior) {
            await this.registrarCambioDePrecio(anterior, funcion, nombrePelicula);
          }
        } catch (error) {
          if (error instanceof SalaNoDisponibleError) {
            fallidas.push(`${fecha}: ${error.message}`);
            continue;
          }
          throw error;
        }
      }

      this.funciones.update((funciones) => {
        if (id) {
          return funciones.map((elemento) => (elemento.id === id && creadas[0] ? creadas[0] : elemento));
        }
        return [...funciones, ...creadas];
      });

      const mensajeCreacion = id
        ? 'Función actualizada.'
        : `Se crearon ${creadas.length} de ${fechasProgramadas.length} funciones para ${nombrePelicula}.`;

      const sala = creadas[0]
        ? this.salas().find((elemento) => elemento.id === creadas[0].sala_id)?.nombre
        : undefined;
      this.nuevaFuncion();
      if (fallidas.length > 0) {
        this.error.set(`${mensajeCreacion} Fechas sin sala disponible: ${fallidas.join(' · ')}`);
      } else {
        this.mensaje.set(
          `${mensajeCreacion}${sala && creadas.length === 1 ? ` Sala asignada: ${sala}.` : ''}`,
        );
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar la función.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Elimina una función tras confirmar. */
  async eliminar(funcion: Funcion): Promise<void> {
    if (this.eliminandoId() || !window.confirm('¿Eliminar esta función?')) {
      return;
    }

    const nombrePelicula = this.nombrePelicula(funcion.pelicula_id);

    this.eliminandoId.set(funcion.id);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      await this.servicioFunciones.eliminar(funcion.id);

      await this.servicioLog.registrar({
        accion: 'eliminar_funcion',
        entidad: 'funciones',
        entidadId: funcion.id,
        detalle: `Eliminó la función ${this.describirFuncion(funcion, nombrePelicula)}`,
      });

      this.funciones.update((funciones) => funciones.filter((elemento) => elemento.id !== funcion.id));
      this.mensaje.set('Función eliminada.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar la función.');
    } finally {
      this.eliminandoId.set(null);
    }
  }

  /** Nombre de la película por id. */
  nombrePelicula(id: string): string {
    return this.peliculas().find((pelicula) => pelicula.id === id)?.nombre ?? 'Película';
  }

  /** Nombre de la sala por id. */
  nombreSala(id: string): string {
    return this.salas().find((sala) => sala.id === id)?.nombre ?? 'Sala';
  }

  /** Valores iniciales del formulario. */
  private formularioVacio(): FormularioFuncion {
    return {
      pelicula_id: '',
      sala_id: '',
      fecha: fechaISO(new Date()),
      hora_inicio: '14:00',
      formato: '2D',
      idioma: 'castellano',
      precio_base: 3500,
      precio_vip: 5000,
      precio_preventa: 2900,
    };
  }
}