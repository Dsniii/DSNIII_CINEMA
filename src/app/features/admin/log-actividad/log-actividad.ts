import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RegistroLog, UsuarioInterno } from '../models/evento-actividad';
import { FiltroActividad, HistorialActividad } from '../servicios/historial-actividad';
import {
  ACCIONES_CONOCIDAS,
  CATEGORIAS_FILTRO,
  CategoriaFiltro,
  InfoAccion,
  accionesDeCategoria,
  describirAccion,
} from '../utils/clasificar-actividad';

/** Cantidad de registros que se leen por página. */
export const TAMANO_PAGINA = 50;

/** Registro del log listo para mostrar en la tabla. */
interface FilaActividad {
  clave: number;
  fecha: string;
  hora: string;
  usuario: string;
  rol: string | null;
  accion: InfoAccion;
  detalle: string;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const FORMATO_HORA = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Pantalla de administración con el registro de actividad. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-log-actividad',
  styleUrl: './log-actividad.css',
  templateUrl: './log-actividad.html',
})
export class LogActividad {
  private readonly historial = inject(HistorialActividad);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly categorias = CATEGORIAS_FILTRO;

  protected readonly categoria = signal<CategoriaFiltro>('todas');
  protected readonly usuarioFiltro = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly texto = signal('');

  protected readonly usuarios = signal<UsuarioInterno[]>([]);
  protected readonly filas = signal<FilaActividad[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cargandoMas = signal(false);
  protected readonly hayMas = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly nombres = signal<ReadonlyMap<string, UsuarioInterno>>(new Map());
  private siguienteClave = 0;
  private consultaActual = 0;
  private cargados = 0;

  protected readonly hayFiltros = computed(
    () =>
      this.categoria() !== 'todas' ||
      this.usuarioFiltro() !== '' ||
      this.desde() !== '' ||
      this.hasta() !== '' ||
      this.texto().trim() !== '',
  );

  constructor() {
    if (this.esNavegador) {
      void this.cargarUsuarios();
      void this.recargar();
    }
  }

  /** Cambia la categoría y vuelve a leer desde el principio. */
  protected elegirCategoria(valor: string): void {
    this.categoria.set(valor as CategoriaFiltro);
    void this.recargar();
  }

  protected elegirUsuario(valor: string): void {
    this.usuarioFiltro.set(valor);
    void this.recargar();
  }

  protected elegirDesde(valor: string): void {
    this.desde.set(valor);
    void this.recargar();
  }

  protected elegirHasta(valor: string): void {
    this.hasta.set(valor);
    void this.recargar();
  }

  protected buscarTexto(valor: string): void {
    if (valor.trim() === this.texto().trim()) {
      return;
    }
    this.texto.set(valor);
    void this.recargar();
  }

  protected limpiarFiltros(): void {
    this.categoria.set('todas');
    this.usuarioFiltro.set('');
    this.desde.set('');
    this.hasta.set('');
    this.texto.set('');
    void this.recargar();
  }

  /** Lee de nuevo la primera página con los filtros actuales. */
  protected async recargar(): Promise<void> {
    const consulta = ++this.consultaActual;
    this.cargando.set(true);
    this.cargandoMas.set(false);
    this.error.set(null);

    try {
      const registros = await this.historial.listar(this.armarFiltro(), 0, TAMANO_PAGINA);
      const filas = await this.armarFilas(registros);
      if (consulta !== this.consultaActual) {
        return;
      }
      this.cargados = registros.length;
      this.filas.set(filas);
      this.hayMas.set(registros.length === TAMANO_PAGINA);
    } catch (error) {
      if (consulta === this.consultaActual) {
        this.filas.set([]);
        this.hayMas.set(false);
        this.error.set(error instanceof Error ? error.message : 'No se pudo cargar la actividad.');
      }
    } finally {
      if (consulta === this.consultaActual) {
        this.cargando.set(false);
      }
    }
  }

  /** Agrega la página siguiente al final de la lista. */
  protected async cargarMas(): Promise<void> {
    if (this.cargando() || this.cargandoMas() || !this.hayMas()) {
      return;
    }

    const consulta = this.consultaActual;
    this.cargandoMas.set(true);
    this.error.set(null);

    try {
      const registros = await this.historial.listar(this.armarFiltro(), this.cargados, TAMANO_PAGINA);
      const filas = await this.armarFilas(registros);
      if (consulta !== this.consultaActual) {
        return;
      }
      this.cargados += registros.length;
      this.filas.update((actuales) => [...actuales, ...filas]);
      this.hayMas.set(registros.length === TAMANO_PAGINA);
    } catch (error) {
      if (consulta === this.consultaActual) {
        this.error.set(error instanceof Error ? error.message : 'No se pudo cargar más actividad.');
      }
    } finally {
      if (consulta === this.consultaActual) {
        this.cargandoMas.set(false);
      }
    }
  }

  private async cargarUsuarios(): Promise<void> {
    try {
      const usuarios = await this.historial.listarUsuariosInternos();
      this.usuarios.set(usuarios);
      this.nombres.update((actuales) => new Map([...actuales, ...usuarios.map((u) => [u.id, u] as const)]));
    } catch (error) {
      // Sin la lista el filtro por usuario queda vacío, pero el historial sigue funcionando.
      console.error(error);
    }
  }

  private armarFiltro(): FiltroActividad {
    const categoria = this.categoria();
    return {
      acciones:
        categoria === 'todas' || categoria === 'otros' ? null : accionesDeCategoria(categoria),
      excluirAcciones: categoria === 'otros' ? ACCIONES_CONOCIDAS : null,
      usuarioId: this.usuarioFiltro() || null,
      desde: this.desde() ? new Date(`${this.desde()}T00:00:00`).toISOString() : null,
      hasta: this.hasta() ? this.finDelDia(this.hasta()) : null,
      texto: this.texto(),
    };
  }

  /** Primer instante del día siguiente, para incluir todo el día elegido en "hasta". */
  private finDelDia(fecha: string): string {
    const dia = new Date(`${fecha}T00:00:00`);
    dia.setDate(dia.getDate() + 1);
    return dia.toISOString();
  }

  /** Convierte registros en filas, buscando los nombres de quienes todavía no se conocen. */
  private async armarFilas(registros: RegistroLog[]): Promise<FilaActividad[]> {
    const desconocidos = [
      ...new Set(
        registros
          .map((registro) => registro.usuario_id)
          .filter((id): id is string => id !== null && !this.nombres().has(id)),
      ),
    ];

    if (desconocidos.length > 0) {
      try {
        const encontrados = await this.historial.buscarUsuarios(desconocidos);
        this.nombres.update(
          (actuales) => new Map([...actuales, ...encontrados.map((u) => [u.id, u] as const)]),
        );
      } catch (error) {
        console.error(error);
      }
    }

    return registros.map((registro) => this.aFila(registro));
  }

  private aFila(registro: RegistroLog): FilaActividad {
    const instante = new Date(registro.fecha_hora);
    const valido = !Number.isNaN(instante.getTime());
    const usuario = registro.usuario_id ? this.nombres().get(registro.usuario_id) : undefined;

    return {
      clave: this.siguienteClave++,
      fecha: valido ? FORMATO_FECHA.format(instante) : '-',
      hora: valido ? FORMATO_HORA.format(instante) : '-',
      usuario: this.nombreDe(registro.usuario_id, usuario),
      rol: usuario?.rol ?? null,
      accion: describirAccion(registro.accion),
      detalle: registro.detalle?.trim() || 'Sin detalle',
    };
  }

  private nombreDe(usuarioId: string | null, usuario: UsuarioInterno | undefined): string {
    if (!usuarioId) {
      return 'Sistema';
    }
    const completo = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim();
    return completo || 'Usuario no encontrado';
  }
}
