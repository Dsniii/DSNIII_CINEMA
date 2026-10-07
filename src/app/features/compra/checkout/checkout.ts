import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Perfil } from '../../../core/models/perfil';
import { Recompensa } from '../../../core/models/recompensa';
import { CatalogoRecompensas } from '../../../core/services/catalogo-recompensas';
import { Perfiles } from '../../../core/services/perfiles';
import { descargarPdfEntradas, descargarPdfProductos } from '../../../core/utils/generar-pdfs-compra';
import { MonedaArsPipe } from '../../../shared/pipes/moneda-ars-pipe';
import { Cupon } from '../../cupones-fidelizacion/models/cupon';
import { Cupones } from '../../cupones-fidelizacion/servicios/cupones';
import { Producto } from '../../candy/models/producto';
import { Productos } from '../../candy/servicios/productos';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { nombreButaca } from '../../salas-funciones/models/butaca';
import { Salas } from '../../salas-funciones/servicios/salas';
import { ResultadoCompra } from '../models/resultado-compra';
import { SeleccionCompra } from '../models/seleccion-compra';
import { Compra } from '../servicios/compra';
import { CompraEnCurso } from '../servicios/compra-en-curso';

/** Nombre de la recompensa "Entrada gratis" en la tabla `recompensas` (sin producto). Solo vale para entradas comunes. */
const NOMBRE_RECOMPENSA_ENTRADA_GRATIS = 'entrada gratis';

/** Cómo se paga una línea del carrito. */
export type MetodoPago = 'dinero' | 'puntos';

/** Línea del carrito de productos. */
export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  metodoPago: MetodoPago;
  /** Recompensa vinculada al producto; si existe, la línea se puede canjear con puntos. */
  recompensa: Recompensa | null;
}

/** Pantalla de pago de la compra: entradas + productos de candy, con canje de puntos y crédito. */
@Component({
  imports: [MonedaArsPipe],
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Pago {
  private readonly productosService = inject(Productos);
  private readonly catalogoRecompensas = inject(CatalogoRecompensas);
  private readonly perfiles = inject(Perfiles);
  private readonly cuponesService = inject(Cupones);
  private readonly compra = inject(Compra);
  private readonly peliculas = inject(Peliculas);
  private readonly salas = inject(Salas);

  /** Selección de butacas de la compra confirmada (se conserva para volver a descargar los PDF). */
  private seleccionConfirmada: SeleccionCompra | null = null;
  private readonly compraEnCurso = inject(CompraEnCurso);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly recompensas = signal<Recompensa[]>([]);
  protected readonly carrito = signal<ItemCarrito[]>([]);
  /** Crédito (ARS) que el usuario decidió aplicar. */
  protected readonly creditoUsado = signal(0);

  /** Cupón de descuento aplicado, o `null` si no hay ninguno. */
  protected readonly cupon = signal<Cupon | null>(null);
  protected readonly errorCupon = signal<string | null>(null);
  protected readonly validandoCupon = signal(false);

  /** Cuántas entradas comunes se pagan con la recompensa "Entrada gratis". */
  protected readonly entradasCanje = signal(0);

  protected readonly confirmando = signal(false);
  protected readonly errorConfirmacion = signal<string | null>(null);
  /** Resultado de la compra ya confirmada; mientras es `null` se muestra el carrito. */
  protected readonly resultado = signal<ResultadoCompra | null>(null);

  protected readonly puntosUsuario = computed(() => Number(this.perfil()?.puntos_fidelizacion ?? 0));
  protected readonly creditoUsuario = computed(() => Number(this.perfil()?.credito ?? 0));

  /** Recompensa "Entrada gratis", si existe en la tabla. */
  protected readonly recompensaEntrada = computed(
    () =>
      this.recompensas().find((r) => r.nombre.trim().toLowerCase() === NOMBRE_RECOMPENSA_ENTRADA_GRATIS) ?? null,
  );

  /** Entradas elegidas que son comunes (la accesible cuenta como común); las VIP no se pueden canjear. */
  protected readonly entradasComunes = computed(
    () => this.compraEnCurso.seleccion()?.butacas.filter((b) => b.categoria === 'normal').length ?? 0,
  );

  /** Puntos que ya se van a gastar en productos canjeados. */
  private readonly puntosProductos = computed(() =>
    this.carrito().reduce(
      (acc, i) => (i.metodoPago === 'puntos' && i.recompensa ? acc + i.recompensa.costo_puntos * i.cantidad : acc),
      0,
    ),
  );

  /** Máximo de entradas gratis canjeables: comunes elegidas y puntos disponibles. */
  protected readonly maximoEntradasCanje = computed(() => {
    const costo = this.recompensaEntrada()?.costo_puntos ?? 0;
    if (costo <= 0) {
      return 0;
    }
    const alcanzan = Math.floor((this.puntosUsuario() - this.puntosProductos()) / costo);
    return Math.max(0, Math.min(this.entradasComunes(), alcanzan));
  });

  /** Descuento por las entradas canjeadas: precio de la entrada común × cantidad. */
  protected readonly descuentoEntradasCanje = computed(() => {
    const precio = this.compraEnCurso.seleccion()?.precios.normal ?? 0;
    return Math.round(precio * this.entradasCanje() * 100) / 100;
  });

  /** Total de las entradas a pagar con dinero (ya sin las canjeadas con puntos). */
  protected readonly totalEntradas = computed(() =>
    Math.max(0, (this.compraEnCurso.seleccion()?.total ?? 0) - this.descuentoEntradasCanje()),
  );
  protected readonly cantidadEntradas = computed(() => {
    const c = this.compraEnCurso.seleccion()?.cantidades;
    return c ? c.normal + c.vip : 0;
  });

  /** Productos activos, ordenados por nombre, con su recompensa (si tienen). */
  protected readonly catalogo = computed(() => {
    const porProducto = new Map(
      this.recompensas()
        .filter((r) => r.tipo === 'producto' && r.producto_id)
        .map((r) => [r.producto_id as string, r]),
    );
    return this.productos()
      .filter((p) => p.activo)
      .map((producto) => ({ producto, recompensa: porProducto.get(producto.id) ?? null }));
  });

  /** Productos pagados con dinero. */
  protected readonly subtotalProductos = computed(() =>
    this.carrito().reduce(
      (acc, i) => (i.metodoPago === 'dinero' ? acc + Number(i.producto.precio) * i.cantidad : acc),
      0,
    ),
  );

  protected readonly subtotal = computed(() => this.totalEntradas() + this.subtotalProductos());

  protected readonly puntosAUsar = computed(
    () => this.puntosProductos() + (this.recompensaEntrada()?.costo_puntos ?? 0) * this.entradasCanje(),
  );

  protected readonly puntosRestantes = computed(() => this.puntosUsuario() - this.puntosAUsar());

  /** Descuento del cupón: porcentaje sobre el subtotal (entradas + productos pagados con dinero). */
  protected readonly descuentoCupon = computed(() => {
    const cupon = this.cupon();
    if (!cupon) {
      return 0;
    }
    const porcentaje = Math.min(100, Math.max(0, Number(cupon.porcentaje_descuento)));
    return Math.round(this.subtotal() * porcentaje) / 100;
  });

  /** Lo que queda por pagar después del cupón (base sobre la que se aplica el crédito). */
  protected readonly subtotalConDescuento = computed(() => Math.max(0, this.subtotal() - this.descuentoCupon()));

  /** El crédito aplicado nunca supera el saldo ni lo que queda por pagar tras el cupón. */
  protected readonly creditoAplicado = computed(() =>
    Math.min(this.creditoUsado(), this.creditoUsuario(), this.subtotalConDescuento()),
  );

  protected readonly totalAPagar = computed(() => Math.max(0, this.subtotalConDescuento() - this.creditoAplicado()));

  /** Hay algo para comprar (entradas o productos), hay sesión y no se está procesando. */
  protected readonly puedeConfirmar = computed(
    () =>
      !this.confirmando() &&
      this.perfil() !== null &&
      (this.carrito().length > 0 || this.cantidadEntradas() > 0),
  );

  protected readonly cantidadItems = computed(() => this.carrito().reduce((acc, i) => acc + i.cantidad, 0));

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

    // Cada carga es independiente: si falla el perfil (p. ej. sin sesión) o las
    // recompensas, igual se muestran los productos, solo sin canje por puntos/crédito.
    const [productos, recompensas, perfil] = await Promise.allSettled([
      this.productosService.listar(),
      this.catalogoRecompensas.listar(),
      this.perfiles.obtenerPerfilActual(),
    ]);

    if (productos.status === 'fulfilled') {
      this.productos.set(productos.value);
    } else {
      console.error('Checkout: error al cargar productos', productos.reason);
      this.error.set('No pudimos cargar los productos.');
    }

    if (recompensas.status === 'fulfilled') {
      this.recompensas.set(recompensas.value);
    } else {
      console.error('Checkout: error al cargar recompensas', recompensas.reason);
    }

    if (perfil.status === 'fulfilled') {
      this.perfil.set(perfil.value);
    } else {
      console.error('Checkout: error al cargar el perfil', perfil.reason);
      this.aviso.set('Iniciá sesión para canjear puntos o usar tu crédito.');
    }

    this.cargando.set(false);
  }

  protected cantidadEnCarrito(productoId: string): number {
    return this.carrito().find((i) => i.producto.id === productoId)?.cantidad ?? 0;
  }

  protected agregar(producto: Producto, recompensa: Recompensa | null): void {
    this.aviso.set(null);
    const existente = this.carrito().find((i) => i.producto.id === producto.id);
    if (existente) {
      this.cambiarCantidad(existente, 1);
      return;
    }
    this.carrito.update((items) => [...items, { producto, cantidad: 1, metodoPago: 'dinero', recompensa }]);
  }

  protected cambiarCantidad(item: ItemCarrito, delta: number): void {
    this.aviso.set(null);
    const nueva = item.cantidad + delta;
    if (nueva <= 0) {
      this.quitar(item);
      return;
    }
    // Si la línea se paga con puntos, la nueva cantidad no puede pasarse del saldo.
    if (item.metodoPago === 'puntos' && item.recompensa) {
      const extra = item.recompensa.costo_puntos * delta;
      if (this.puntosAUsar() + extra > this.puntosUsuario()) {
        this.aviso.set('No tenés puntos suficientes para canjear más unidades de este producto.');
        return;
      }
    }
    this.reemplazar(item, { ...item, cantidad: nueva });
  }

  protected cambiarMetodoPago(item: ItemCarrito, metodo: MetodoPago): void {
    this.aviso.set(null);
    if (metodo === 'puntos') {
      if (!item.recompensa) {
        return;
      }
      if (this.puntosAUsar() + item.recompensa.costo_puntos * item.cantidad > this.puntosUsuario()) {
        this.aviso.set('No tenés puntos suficientes para canjear este producto.');
        return;
      }
    }
    this.reemplazar(item, { ...item, metodoPago: metodo });
  }

  /** Suma o resta una entrada común pagada con puntos ("Entrada gratis"). */
  protected cambiarEntradasCanje(delta: 1 | -1): void {
    this.aviso.set(null);
    const nueva = this.entradasCanje() + delta;
    if (nueva < 0) {
      return;
    }
    if (nueva > this.maximoEntradasCanje()) {
      this.aviso.set(
        this.entradasComunes() === 0
          ? 'La entrada gratis solo se puede canjear por entradas comunes, no VIP.'
          : nueva > this.entradasComunes()
            ? 'Solo podés canjear entradas comunes (no VIP).'
            : 'No tenés puntos suficientes para canjear otra entrada.',
      );
      return;
    }
    this.entradasCanje.set(nueva);
  }

  protected quitar(item: ItemCarrito): void {
    this.carrito.update((items) => items.filter((i) => i !== item));
  }

  /** Aplica el crédito ingresado, limitado a lo que tiene el usuario y a lo que hay que pagar. */
  protected aplicarCredito(valor: string): void {
    this.aviso.set(null);
    const monto = Math.max(0, Number(valor) || 0);
    const maximo = Math.min(this.creditoUsuario(), this.subtotalConDescuento());
    if (monto > maximo) {
      this.aviso.set('El crédito supera tu saldo o el total a pagar; lo ajustamos al máximo posible.');
    }
    this.creditoUsado.set(Math.min(monto, maximo));
  }

  protected usarTodoElCredito(): void {
    this.aplicarCredito(String(Math.min(this.creditoUsuario(), this.subtotalConDescuento())));
  }

  /** Valida el código ingresado contra la tabla `cupones` y, si corresponde, lo aplica. */
  protected async aplicarCupon(codigo: string): Promise<void> {
    const limpio = codigo.trim();
    this.errorCupon.set(null);
    if (!limpio) {
      this.errorCupon.set('Ingresá un código de cupón.');
      return;
    }
    this.validandoCupon.set(true);
    try {
      const cupon = await this.cuponesService.buscarPorCodigo(limpio);
      const motivo = await this.motivoInvalido(cupon);
      if (motivo || !cupon) {
        this.errorCupon.set(motivo ?? 'El cupón no existe.');
        return;
      }
      this.cupon.set(cupon);
    } catch {
      this.errorCupon.set('No pudimos validar el cupón. Probá de nuevo.');
    } finally {
      this.validandoCupon.set(false);
    }
  }

  protected quitarCupon(): void {
    this.cupon.set(null);
    this.errorCupon.set(null);
  }

  /** Devuelve por qué el cupón no se puede usar, o `null` si es válido. */
  private async motivoInvalido(cupon: Cupon | null): Promise<string | null> {
    if (!cupon || !cupon.activo) {
      return 'El cupón no existe o no está activo.';
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (cupon.fecha_inicio && hoy < cupon.fecha_inicio) {
      return 'Este cupón todavía no está vigente.';
    }
    if (cupon.fecha_fin && hoy > cupon.fecha_fin) {
      return 'Este cupón está vencido.';
    }
    if (cupon.usos_maximo !== null && cupon.usos_maximo !== undefined) {
      const usos = await this.cuponesService.contarUsos(cupon.id);
      if (usos >= cupon.usos_maximo) {
        return 'Ya usaste este cupón el máximo de veces permitido.';
      }
    }
    return null;
  }

  /**
   * Confirma la compra en la base (compra, entradas, productos y canjes), descuenta puntos y
   * crédito recién al terminar, y descarga los 2 PDF.
   */
  protected async confirmarCompra(): Promise<void> {
    if (!this.puedeConfirmar()) {
      return;
    }
    this.confirmando.set(true);
    this.errorConfirmacion.set(null);

    const seleccion = this.compraEnCurso.seleccion();
    try {
      const resultado = await this.compra.confirmar({
        funcionId: seleccion?.funcion.id ?? null,
        butacaIds: seleccion?.butacas.map((b) => b.id) ?? [],
        items: this.carrito().map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          metodo: i.metodoPago === 'puntos' && i.recompensa ? 'puntos' : 'dinero',
        })),
        cuponId: this.cupon()?.id ?? null,
        credito: this.creditoAplicado(),
        entradasCanje: this.entradasCanje(),
      });

      // La compra ya está hecha: se actualiza el saldo en pantalla y se limpia el carrito.
      this.seleccionConfirmada = seleccion;
      const perfil = this.perfil();
      if (perfil) {
        this.perfil.set({
          ...perfil,
          puntos_fidelizacion: resultado.puntos_restantes,
          credito: resultado.credito_restante,
        });
      }
      this.compraEnCurso.limpiar();
      this.carrito.set([]);
      this.cupon.set(null);
      this.creditoUsado.set(0);
      this.entradasCanje.set(0);
      this.resultado.set(resultado);
    } catch (error) {
      this.errorConfirmacion.set(error instanceof Error ? error.message : 'No se pudo confirmar la compra.');
      this.confirmando.set(false);
      return;
    }

    this.confirmando.set(false);
    await this.descargarPdfs();
  }

  /** Genera y descarga los 2 PDF de la compra confirmada (también sirve para volver a bajarlos). */
  protected async descargarPdfs(): Promise<void> {
    const resultado = this.resultado();
    if (!resultado) {
      return;
    }
    this.errorConfirmacion.set(null);

    const perfil = this.perfil();
    const titular = { nombre: perfil?.nombre ?? '', apellido: perfil?.apellido ?? '' };
    const seleccion = this.seleccionConfirmada;

    try {
      if (seleccion && resultado.entradas.length > 0) {
        const [peliculas, salas] = await Promise.allSettled([
          this.peliculas.listarNombres(),
          this.salas.listarSalas(),
        ]);
        const pelicula =
          peliculas.status === 'fulfilled'
            ? (peliculas.value.find((p) => p.id === seleccion.peliculaId)?.nombre ?? '')
            : '';
        const sala =
          salas.status === 'fulfilled'
            ? (salas.value.find((x) => String(x.id) === String(seleccion.funcion.sala_id))?.nombre ?? '')
            : '';

        await descargarPdfEntradas({
          compraId: resultado.compra_id,
          fechaCompra: resultado.fecha_hora,
          titular,
          pelicula,
          sala,
          fechaFuncion: seleccion.funcion.fecha,
          horaInicio: seleccion.funcion.hora_inicio,
          horaFin: seleccion.funcion.hora_fin,
          formato: seleccion.funcion.formato,
          idioma: seleccion.funcion.idioma,
          entradas: resultado.entradas.map((entrada) => {
            const butaca = seleccion.butacas.find((b) => b.id === entrada.butaca_id);
            return {
              butaca: butaca ? nombreButaca(butaca) : '-',
              categoria: butaca?.categoria === 'vip' ? 'VIP' : 'Normal',
              precio: entrada.precio,
              qr_code: entrada.qr_code,
              canjeada: entrada.canjeada,
            };
          }),
        });
      }

      const hayResumen =
        resultado.productos.length > 0 ||
        resultado.canjes.length > 0 ||
        resultado.puntos_utilizados > 0 ||
        resultado.puntos_ganados > 0 ||
        resultado.credito_utilizado > 0 ||
        resultado.descuento_cupon > 0;
      if (hayResumen) {
        await descargarPdfProductos({
          compraId: resultado.compra_id,
          fechaCompra: resultado.fecha_hora,
          titular,
          productos: resultado.productos,
          canjes: resultado.canjes,
          subtotalEntradas: resultado.subtotal_entradas,
          subtotalProductos: resultado.subtotal_productos,
          subtotal: resultado.subtotal,
          descuentoCupon: resultado.descuento_cupon,
          cuponCodigo: resultado.cupon_codigo,
          creditoUtilizado: resultado.credito_utilizado,
          puntosUtilizados: resultado.puntos_utilizados,
          puntosGanados: resultado.puntos_ganados,
          entradasCanjeadas: resultado.entradas_canjeadas,
          puntosEntradas: resultado.puntos_entradas,
          total: resultado.total,
          puntosRestantes: resultado.puntos_restantes,
          creditoRestante: resultado.credito_restante,
        });
      }
    } catch (error) {
      console.error('Checkout: error al generar los PDF', error);
      this.errorConfirmacion.set('La compra se confirmó, pero no pudimos generar los PDF. Probá descargarlos de nuevo.');
    }
  }

  private reemplazar(anterior: ItemCarrito, nuevo: ItemCarrito): void {
    this.carrito.update((items) => items.map((i) => (i === anterior ? nuevo : i)));
  }
}