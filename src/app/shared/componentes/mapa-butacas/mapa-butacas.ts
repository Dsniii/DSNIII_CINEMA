import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Butaca, letraFila, nombreButaca } from '../../../features/salas-funciones/models/butaca';

/** Fila del mapa lista para dibujar. */
interface FilaMapa {
  numero: number;
  letra: string;
  butacas: Butaca[];
  /** Cuántas columnas de la grilla ocupa cada butaca (las filas con menos butacas las ensanchan). */
  ancho: number;
}

/** Estado visual de una butaca. */
type EstadoButaca = 'libre' | 'seleccionada' | 'ocupada';

/** Mapa de butacas de una sala: solo dibuja y avisa los clics, las reglas las decide quien lo usa. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-mapa-butacas',
  styleUrl: './mapa-butacas.css',
  templateUrl: './mapa-butacas.html',
})
export class MapaButacas {
  /** Butacas de la sala. */
  readonly butacas = input<readonly Butaca[]>([]);
  /** Ids de las butacas que no se pueden elegir (reservadas por otros). */
  readonly ocupadas = input<ReadonlySet<string>>(new Set());
  /** Ids de las butacas elegidas por el usuario. */
  readonly seleccionadas = input<readonly string[]>([]);
  /** Se emite al hacer clic en una butaca libre o seleccionada. */
  readonly alternar = output<Butaca>();

  protected readonly columnasMaximas = computed(() =>
    this.filas().reduce((maximo, fila) => Math.max(maximo, fila.butacas.length), 1),
  );

  protected readonly filas = computed<FilaMapa[]>(() => {
    const porFila = new Map<number, Butaca[]>();
    for (const butaca of this.butacas()) {
      const lista = porFila.get(butaca.fila) ?? [];
      lista.push(butaca);
      porFila.set(butaca.fila, lista);
    }

    const maximo = Math.max(1, ...[...porFila.values()].map((lista) => lista.length));
    return [...porFila.entries()]
      .sort(([a], [b]) => a - b)
      .map(([numero, lista]) => ({
        numero,
        letra: letraFila(numero),
        butacas: [...lista].sort((a, b) => a.columna - b.columna),
        ancho: Math.max(1, Math.round(maximo / lista.length)),
      }));
  });

  private readonly idsSeleccionadas = computed(() => new Set(this.seleccionadas()));

  protected estado(butaca: Butaca): EstadoButaca {
    if (this.ocupadas().has(butaca.id)) {
      return 'ocupada';
    }
    return this.idsSeleccionadas().has(butaca.id) ? 'seleccionada' : 'libre';
  }

  protected descripcion(butaca: Butaca): string {
    const tipo = butaca.tipo === 'vip' ? 'VIP' : butaca.tipo === 'accesible' ? 'accesible' : 'normal';
    const estado = { libre: 'disponible', seleccionada: 'seleccionada', ocupada: 'ocupada' }[
      this.estado(butaca)
    ];
    return `Butaca ${nombreButaca(butaca)}, ${tipo}, ${estado}`;
  }

  protected elegir(butaca: Butaca): void {
    if (this.estado(butaca) !== 'ocupada') {
      this.alternar.emit(butaca);
    }
  }
}
