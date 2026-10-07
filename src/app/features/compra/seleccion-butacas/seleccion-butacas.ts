import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Autenticacion } from '../../../core/services/auth';
import { MapaButacas } from '../../../shared/componentes/mapa-butacas/mapa-butacas';
import { MonedaArsPipe } from '../../../shared/pipes/moneda-ars-pipe';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { Butaca, nombreButaca } from '../../salas-funciones/models/butaca';
import { Funcion } from '../../salas-funciones/models/funcion';
import { Butacas } from '../../salas-funciones/servicios/butacas';
import { Funciones } from '../../salas-funciones/servicios/funciones';
import { Salas } from '../../salas-funciones/servicios/salas';
import {
  ButacaElegida,
  CantidadesEntradas,
  CategoriaEntrada,
  PreciosEntrada,
} from '../models/seleccion-compra';
import { CompraEnCurso } from '../servicios/compra-en-curso';
import { ErrorReservaButacas, ReservasEnVivo, ReservasTemporales } from '../servicios/reservas-temporales';
import { calcularTotal, categoriaDeButaca, preciosDeFuncion } from '../utils/precios-funcion';

/** Máximo de entradas por compra. */
const MAXIMO_ENTRADAS = 10;
/** Cada cuánto se revisa si venció alguna reserva de otra persona. */
const INTERVALO_VENCIMIENTOS_MS = 5000;
/** Una reserva con vencimiento en este año o después es una compra confirmada (nunca vence). */
const INICIO_SIN_VENCIMIENTO = Date.parse('9999-01-01T00:00:00Z');

const NOMBRES_CATEGORIA: Record<CategoriaEntrada, string> = { normal: 'Normal', vip: 'VIP' };
const ADJETIVOS_CATEGORIA: Record<CategoriaEntrada, string> = { normal: 'normales', vip: 'VIP' };

/** Función lista para mostrar en una tarjeta. */
interface FuncionVista {
  funcion: Funcion;
  fecha: string;
  horario: string;
  detalle: string;
  sala: string;
  precios: PreciosEntrada;
}

/** Renglón del recuadro de entradas. */
interface RenglonEntrada {
  categoria: CategoriaEntrada;
  nombre: string;
  precio: number;
  cantidad: number;
  elegidas: number;
  subtotal: number;
}

/** Convierte `YYYY-MM-DD` en una fecha local sin correrla por zona horaria. */
function fechaLocal(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Fecha local como `YYYY-MM-DD`. */
function aTextoFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Pantalla para elegir las butacas de la función. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapaButacas, MonedaArsPipe, RouterLink],
  selector: 'app-seleccion-butacas',
  styleUrl: './seleccion-butacas.css',
  templateUrl: './seleccion-butacas.html',
})
export class SeleccionButacas {
  private readonly ruta = inject(ActivatedRoute);
  private readonly enrutador = inject(Router);
  private readonly autenticacion = inject(Autenticacion);
  private readonly serviciosFunciones = inject(Funciones);
  private readonly serviciosButacas = inject(Butacas);
  private readonly serviciosSalas = inject(Salas);
  private readonly serviciosPeliculas = inject(Peliculas);
  private readonly reservas = inject(ReservasTemporales);
  private readonly compraEnCurso = inject(CompraEnCurso);

  protected readonly maximoEntradas = MAXIMO_ENTRADAS;

  private readonly peliculaId =
    this.ruta.snapshot.paramMap.get('peliculaId') ??
    this.ruta.snapshot.queryParamMap.get('pelicula') ??
    '';

  protected readonly nombrePelicula = signal('');
  protected readonly funciones = signal<Funcion[]>([]);
  protected readonly cargandoFunciones = signal(true);
  protected readonly funcionElegida = signal<Funcion | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  protected readonly cargandoMapa = signal(false);
  protected readonly cantidades = signal<CantidadesEntradas>({ normal: 0, vip: 0 });
  protected readonly seleccionadas = signal<readonly string[]>([]);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  /** `undefined` mientras no se sabe si hay sesión; `null` si no la hay. */
  protected readonly usuarioId = signal<string | null | undefined>(undefined);

  private readonly nombresSala = signal<ReadonlyMap<string, string>>(new Map());
  private readonly ahora = signal(Date.now());
  private readonly enVivo = signal<ReservasEnVivo | null>(null);

  /** `true` mientras llegan en vivo los cambios de otras personas. */
  protected readonly conectado = computed(() => this.enVivo()?.conectado() ?? false);

  protected readonly funcionesVista = computed<FuncionVista[]>(() =>
    this.funciones().map((funcion) => ({
      funcion,
      fecha: new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(fechaLocal(funcion.fecha)),
      horario: `${funcion.hora_inicio.slice(0, 5)} - ${funcion.hora_fin.slice(0, 5)}`,
      detalle: `${funcion.formato} · ${funcion.idioma === 'subtitulada' ? 'Subtitulada' : 'Castellano'}`,
      sala: this.nombresSala().get(String(funcion.sala_id)) ?? '',
      precios: preciosDeFuncion(funcion),
    })),
  );

  /** Butacas que no se pueden elegir: reservadas por otra persona y todavía vigentes. */
  protected readonly ocupadas = computed<ReadonlySet<string>>(() => {
    const ahora = this.ahora();
    const yo = this.usuarioId();
    const reservas = this.enVivo()?.reservas() ?? [];
    return new Set(
      reservas
        .filter((reserva) => {
          const vencimiento = Date.parse(reserva.expira_en);
          // Las propias solo cuentan como ocupadas si ya fueron compradas.
          return vencimiento > ahora && (reserva.usuario_id !== yo || vencimiento >= INICIO_SIN_VENCIMIENTO);
        })
        .map((reserva) => reserva.butaca_id),
    );
  });

  private readonly butacaPorId = computed(
    () => new Map(this.butacas().map((butaca) => [butaca.id, butaca])),
  );

  private readonly elegidas = computed<ButacaElegida[]>(() =>
    this.seleccionadas().flatMap((id) => {
      const butaca = this.butacaPorId().get(id);
      return butaca
        ? [
            {
              id,
              fila: butaca.fila,
              columna: butaca.columna,
              categoria: categoriaDeButaca(butaca.tipo),
            },
          ]
        : [];
    }),
  );

  protected readonly nombresElegidas = computed(() =>
    this.elegidas().map((elegida) => nombreButaca(elegida)),
  );

  private readonly elegidasPorCategoria = computed<CantidadesEntradas>(() => ({
    normal: this.elegidas().filter((e) => e.categoria === 'normal').length,
    vip: this.elegidas().filter((e) => e.categoria === 'vip').length,
  }));

  private readonly precios = computed<PreciosEntrada>(() => {
    const funcion = this.funcionElegida();
    return funcion ? preciosDeFuncion(funcion) : { normal: 0, vip: 0 };
  });

  protected readonly totalEntradas = computed(
    () => this.cantidades().normal + this.cantidades().vip,
  );

  /** Precio acumulado de las entradas pedidas. */
  protected readonly total = computed(() => calcularTotal(this.cantidades(), this.precios()));

  protected readonly renglones = computed<RenglonEntrada[]>(() =>
    (['normal', 'vip'] as const).map((categoria) => ({
      categoria,
      nombre: NOMBRES_CATEGORIA[categoria],
      precio: this.precios()[categoria],
      cantidad: this.cantidades()[categoria],
      elegidas: this.elegidasPorCategoria()[categoria],
      subtotal: Math.round(this.precios()[categoria] * this.cantidades()[categoria] * 100) / 100,
    })),
  );

  /** Texto que explica qué falta para poder seguir, o `null` si ya se puede. */
  protected readonly faltante = computed<string | null>(() => {
    if (!this.funcionElegida()) {
      return 'Elegí una función.';
    }
    if (this.totalEntradas() === 0) {
      return 'Sumá al menos una entrada.';
    }
    const pendientes = this.renglones()
      .filter((renglon) => renglon.elegidas < renglon.cantidad)
      .map((renglon) => `${renglon.cantidad - renglon.elegidas} ${ADJETIVOS_CATEGORIA[renglon.categoria]}`);
    return pendientes.length > 0 ? `Te falta ubicar: ${pendientes.join(' y ')}.` : null;
  });

  protected readonly puedeAvanzar = computed(() => this.faltante() === null && !this.procesando());

  constructor() {
    const destruir = inject(DestroyRef);

    // Si otra persona reserva una butaca ya elegida, se la saca de la selección.
    effect(() => {
      const ocupadas = this.ocupadas();
      const actuales = untracked(this.seleccionadas);
      const libres = actuales.filter((id) => !ocupadas.has(id));
      if (libres.length !== actuales.length) {
        this.seleccionadas.set(libres);
        this.aviso.set('Otra persona reservó una de tus butacas. Elegí otra.');
      }
    });

    // Todo lo que usa la red o timers se carga solo en el navegador.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    const temporizador = setInterval(
      () => this.ahora.set(Date.now()),
      INTERVALO_VENCIMIENTOS_MS,
    );
    destruir.onDestroy(() => {
      clearInterval(temporizador);
      this.enVivo()?.cerrar();
    });

    void this.inicializar();
  }

  /** Elige una función y carga el mapa de su sala con las reservas en vivo. */
  protected async elegirFuncion(funcion: Funcion): Promise<void> {
    if (this.funcionElegida()?.id === funcion.id) {
      return;
    }

    this.enVivo()?.cerrar();
    this.enVivo.set(null);
    this.seleccionadas.set([]);
    this.butacas.set([]);
    this.aviso.set(null);
    this.error.set(null);
    this.funcionElegida.set(funcion);
    this.cargandoMapa.set(true);
    this.enVivo.set(this.reservas.observar(funcion.id));

    try {
      const butacas = await this.serviciosButacas.listarPorSala(String(funcion.sala_id));
      // Si mientras tanto eligió otra función, se descarta este resultado.
      if (this.funcionElegida()?.id === funcion.id) {
        this.butacas.set(butacas);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el mapa.');
    } finally {
      if (this.funcionElegida()?.id === funcion.id) {
        this.cargandoMapa.set(false);
      }
    }
  }

  /** Suma o resta una entrada de la categoría. */
  protected cambiarCantidad(categoria: CategoriaEntrada, delta: 1 | -1): void {
    const actual = this.cantidades();
    const nueva = actual[categoria] + delta;
    if (nueva < 0 || this.totalEntradas() + delta > MAXIMO_ENTRADAS) {
      return;
    }

    this.cantidades.set({ ...actual, [categoria]: nueva });
    this.aviso.set(null);

    // Si baja el cupo, se sacan las últimas butacas elegidas de esa categoría.
    const sobrantes = this.elegidasPorCategoria()[categoria] - nueva;
    if (sobrantes > 0) {
      const aQuitar = new Set(
        this.elegidas()
          .filter((elegida) => elegida.categoria === categoria)
          .slice(-sobrantes)
          .map((elegida) => elegida.id),
      );
      this.seleccionadas.update((ids) => ids.filter((id) => !aQuitar.has(id)));
    }
  }

  /** Elige o quita una butaca respetando el cupo de cada categoría. */
  protected alternarButaca(butaca: Butaca): void {
    if (!this.funcionElegida() || this.ocupadas().has(butaca.id)) {
      return;
    }

    if (this.seleccionadas().includes(butaca.id)) {
      this.seleccionadas.update((ids) => ids.filter((id) => id !== butaca.id));
      this.aviso.set(null);
      return;
    }

    const categoria = categoriaDeButaca(butaca.tipo);
    const adjetivo = ADJETIVOS_CATEGORIA[categoria];
    if (this.cantidades()[categoria] === 0) {
      this.aviso.set(`Primero sumá al menos una entrada ${categoria === 'vip' ? 'VIP' : 'normal'}.`);
      return;
    }
    if (this.elegidasPorCategoria()[categoria] >= this.cantidades()[categoria]) {
      this.aviso.set(`Ya elegiste todas las butacas ${adjetivo}. Aumentá la cantidad o quitá una.`);
      return;
    }

    this.seleccionadas.update((ids) => [...ids, butaca.id]);
    this.aviso.set(null);
  }

  /** Reserva las butacas 5 minutos (si hay sesión) y sigue a la compra. */
  protected async siguiente(): Promise<void> {
    const funcion = this.funcionElegida();
    if (!funcion || !this.puedeAvanzar()) {
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    try {
      const { data } = await this.autenticacion.obtenerUsuario();
      this.usuarioId.set(data.user?.id ?? null);

      // Sin sesión se puede seguir comprando, pero las butacas no quedan retenidas.
      const reservaExpiraEn = data.user
        ? await this.reservas.reservar(funcion.id, [...this.seleccionadas()])
        : null;

      this.compraEnCurso.guardar({
        peliculaId: this.peliculaId,
        funcion,
        cantidades: this.cantidades(),
        precios: this.precios(),
        total: this.total(),
        butacas: this.elegidas(),
        reservaExpiraEn,
      });

      await this.enrutador.navigate(['compra', this.peliculaId, 'checkout'], {
        queryParams: { pelicula: this.peliculaId, funcion: funcion.id },
      });
    } catch (error) {
      if (error instanceof ErrorReservaButacas && error.codigo === 'butaca_ocupada') {
        await this.enVivo()?.recargar();
        this.error.set('Alguna de tus butacas ya fue reservada por otra persona. Revisá el mapa y elegí otra.');
      } else {
        this.error.set(error instanceof Error ? error.message : 'No se pudo continuar con la compra.');
      }
    } finally {
      this.procesando.set(false);
    }
  }

  private async inicializar(): Promise<void> {
    const hoy = new Date();
    const [usuario, funciones, peliculas, salas] = await Promise.allSettled([
      this.autenticacion.obtenerUsuario(),
      this.serviciosFunciones.listarPorPelicula(this.peliculaId, aTextoFecha(hoy)),
      this.serviciosPeliculas.listarNombres(),
      this.serviciosSalas.listarSalas(),
    ]);

    this.usuarioId.set(usuario.status === 'fulfilled' ? (usuario.value.data.user?.id ?? null) : null);

    if (peliculas.status === 'fulfilled') {
      this.nombrePelicula.set(peliculas.value.find((p) => p.id === this.peliculaId)?.nombre ?? '');
    }
    if (salas.status === 'fulfilled') {
      this.nombresSala.set(new Map(salas.value.map((sala) => [String(sala.id), sala.nombre])));
    }

    if (funciones.status === 'fulfilled') {
      // Se descartan las funciones de hoy que ya empezaron.
      const hoyTexto = aTextoFecha(hoy);
      const horaActual = hoy.toTimeString().slice(0, 5);
      const proximas = funciones.value.filter(
        (funcion) =>
          funcion.fecha > hoyTexto ||
          (funcion.fecha === hoyTexto && funcion.hora_inicio.slice(0, 5) > horaActual),
      );
      this.funciones.set(proximas);
      if (proximas.length === 1) {
        void this.elegirFuncion(proximas[0]);
      }
    } else {
      this.error.set('No se pudieron cargar las funciones. Probá de nuevo en unos minutos.');
    }

    this.cargandoFunciones.set(false);
  }
}