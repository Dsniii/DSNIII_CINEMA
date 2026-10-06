import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Perfil } from '../../../core/models/perfil';
import { Recompensa } from '../../../core/models/recompensa';
import { CatalogoRecompensas } from '../../../core/services/catalogo-recompensas';
import { Canjes } from '../../../core/services/canjes';
import { Perfiles } from '../../../core/services/perfiles';
import { descargarPdfCanje } from '../../../core/utils/generar-pdf-canje';

const formatoNumero = new Intl.NumberFormat('es-AR');
const formatoPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** Recompensa lista para mostrar, ya comparada con los puntos del usuario. */
interface RecompensaVista {
  id: string;
  nombre: string;
  categoria: string;
  imagen: string | null;
  precioTexto: string | null;
  costoTexto: string;
  alcanzable: boolean;
  estado: string;
  progreso: number;
}

/** Pantalla con los puntos de fidelización del cliente. */
@Component({
  imports: [],
  selector: 'app-mis-puntos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './mis-puntos.css',
  templateUrl: './mis-puntos.html',
})
export class MisPuntos {
  private readonly perfiles = inject(Perfiles);
  private readonly catalogo = inject(CatalogoRecompensas);
  private readonly canjes = inject(Canjes);

  protected readonly puntos = signal(0);
  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly recompensas = signal<Recompensa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** id de la recompensa que se está canjeando en este momento, o null si no hay ninguna en curso. */
  protected readonly canjeandoId = signal<string | null>(null);
  protected readonly errorCanje = signal<string | null>(null);

  protected readonly puntosTexto = computed(() => formatoNumero.format(this.puntos()));

  /** Se ocultan las recompensas cuyo producto fue desactivado en el catálogo. */
  protected readonly recompensasVista = computed<RecompensaVista[]>(() => {
    const puntos = this.puntos();

    return this.recompensas()
      .filter((r) => r.productos?.activo !== false)
      .map((r) => {
        const costo = Number(r.costo_puntos);
        const faltan = Math.max(0, costo - puntos);
        const producto = r.productos;

        return {
          id: r.id,
          nombre: r.nombre,
          categoria: producto?.categorias_producto?.nombre ?? this.capitalizar(r.tipo),
          imagen: producto?.imagen_path?.trim() || null,
          precioTexto: producto ? formatoPesos.format(Number(producto.precio)) : null,
          costoTexto: formatoNumero.format(costo),
          alcanzable: faltan === 0,
          estado:
            faltan === 0
              ? 'Ya podés canjearla'
              : `Te faltan ${formatoNumero.format(faltan)} ${faltan === 1 ? 'punto' : 'puntos'}`,
          progreso: costo > 0 ? Math.min(100, Math.round((puntos / costo) * 100)) : 100,
        };
      });
  });

  protected readonly cantidadAlcanzables = computed(
    () => this.recompensasVista().filter((r) => r.alcanzable).length,
  );

  constructor() {
    // En el servidor (SSR) no hay sesión de Supabase: se carga solo en el navegador.
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
      const [perfil, recompensas] = await Promise.all([
        this.perfiles.obtenerPerfilActual(),
        this.catalogo.listar(),
      ]);
      this.perfil.set(perfil);
      this.puntos.set(Number(perfil.puntos_fidelizacion ?? 0));
      this.recompensas.set(recompensas);
    } catch {
      this.error.set('No pudimos cargar tus puntos.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Canjea la recompensa, actualiza el saldo en pantalla y descarga el PDF con el QR. */
  protected async onCanjear(id: string): Promise<void> {
    this.errorCanje.set(null);
    this.canjeandoId.set(id);
    try {
      const resultado = await this.canjes.canjear(id);
      this.puntos.set(resultado.puntos_restantes);

      const perfil = this.perfil();
      await descargarPdfCanje(resultado, {
        nombre: perfil?.nombre ?? '',
        apellido: perfil?.apellido ?? '',
      });
    } catch {
      this.errorCanje.set('No pudimos canjear la recompensa. Probá de nuevo.');
    } finally {
      this.canjeandoId.set(null);
    }
  }

  private capitalizar(texto: string): string {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : 'Recompensa';
  }
}