import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  EntradaVista,
  PeriodoRanking,
  ProductoVendido,
  TipoPeriodo,
} from '../models/estadisticas-dashboard';
import { EstadisticasDashboard } from '../servicios/estadisticas-dashboard';
import {
  armarRankingPeliculas,
  armarRankingProductos,
  inicioDeVentana,
} from '../utils/armar-estadisticas-dashboard';

/** Cuántas películas se dibujan en cada gráfico. */
export const PELICULAS_POR_GRAFICO = 5;

/** Barra lista para dibujar. */
interface Barra {
  nombre: string;
  entradas: number;
  /** Ancho de la barra, 0–100, relativo a la película más vista del período. */
  porcentaje: number;
}

/** Gráfico (semanal o mensual) listo para mostrar. */
interface Grafico {
  tipo: TipoPeriodo;
  titulo: string;
  periodos: { clave: string; etiqueta: string }[];
  seleccionado: PeriodoRanking;
  barras: Barra[];
  /** Entradas de las películas que quedaron fuera del top. */
  otras: number;
}

const TITULOS: Record<TipoPeriodo, string> = {
  semana: 'Películas más vistas por semana',
  mes: 'Películas más vistas por mes',
};

/** Pantalla principal del panel de administración. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Tablero {
  private readonly estadisticas = inject(EstadisticasDashboard);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly cargandoPeliculas = signal(false);
  protected readonly errorPeliculas = signal<string | null>(null);
  protected readonly cargandoProducto = signal(false);
  protected readonly errorProducto = signal<string | null>(null);

  private readonly entradas = signal<EntradaVista[]>([]);
  private readonly productos = signal<ProductoVendido[]>([]);
  /** Período elegido en cada gráfico; `null` = el actual. */
  private readonly seleccion = signal<Record<TipoPeriodo, string | null>>({
    semana: null,
    mes: null,
  });

  /** Producto del candy bar más vendido (o `null` si todavía no hay ventas). */
  protected readonly productoMasVendido = computed(() => this.productos()[0] ?? null);

  protected readonly graficos = computed<Grafico[]>(() => {
    const ahora = new Date();
    return (['semana', 'mes'] as const).map((tipo) =>
      this.armarGrafico(tipo, armarRankingPeliculas(this.entradas(), tipo, ahora)),
    );
  });

  constructor() {
    if (this.esNavegador) {
      void this.cargar();
    }
  }

  /** Elige otra semana o mes en uno de los gráficos. */
  protected elegirPeriodo(tipo: TipoPeriodo, clave: string): void {
    this.seleccion.update((actual) => ({ ...actual, [tipo]: clave }));
  }

  /** Lee de nuevo las películas y el producto más vendido. */
  protected async cargar(): Promise<void> {
    await Promise.all([this.cargarPeliculas(), this.cargarProducto()]);
  }

  private async cargarPeliculas(): Promise<void> {
    this.cargandoPeliculas.set(true);
    this.errorPeliculas.set(null);
    try {
      this.entradas.set(await this.estadisticas.obtenerEntradasVendidas(inicioDeVentana()));
    } catch (error) {
      this.entradas.set([]);
      this.errorPeliculas.set(
        error instanceof Error ? error.message : 'No se pudieron cargar las películas más vistas.',
      );
    } finally {
      this.cargandoPeliculas.set(false);
    }
  }

  private async cargarProducto(): Promise<void> {
    this.cargandoProducto.set(true);
    this.errorProducto.set(null);
    try {
      this.productos.set(armarRankingProductos(await this.estadisticas.obtenerVentasProductos()));
    } catch (error) {
      this.productos.set([]);
      this.errorProducto.set(
        error instanceof Error ? error.message : 'No se pudo cargar el producto más vendido.',
      );
    } finally {
      this.cargandoProducto.set(false);
    }
  }

  private armarGrafico(tipo: TipoPeriodo, periodos: PeriodoRanking[]): Grafico {
    const elegido = this.seleccion()[tipo];
    const seleccionado = periodos.find((periodo) => periodo.clave === elegido) ?? periodos[0];
    const top = seleccionado.peliculas.slice(0, PELICULAS_POR_GRAFICO);
    const maximo = top[0]?.entradas ?? 0;

    return {
      tipo,
      titulo: TITULOS[tipo],
      periodos: periodos.map(({ clave, etiqueta }) => ({ clave, etiqueta })),
      seleccionado,
      barras: top.map((pelicula) => ({
        ...pelicula,
        porcentaje: maximo > 0 ? Math.round((pelicula.entradas / maximo) * 100) : 0,
      })),
      otras: seleccionado.peliculas
        .slice(PELICULAS_POR_GRAFICO)
        .reduce((suma, pelicula) => suma + pelicula.entradas, 0),
    };
  }
}
