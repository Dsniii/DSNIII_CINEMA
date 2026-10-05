import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../candy/models/producto';
import { Productos } from '../../candy/servicios/productos';
import { Combo, ComboInput, ComboProducto } from '../models/combo';
import { Cupon, CuponInput } from '../models/cupon';
import { Combos } from '../servicios/combos';
import { Cupones } from '../servicios/cupones';

/** Pestaña activa de la pantalla. */
type PestanaAdmin = 'cupones' | 'combos';

/** Valores editables del formulario de cupón. */
interface FormularioCupon {
  codigo: string;
  descripcion: string;
  porcentaje_descuento: number;
  segmento: string;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximo: number | null;
  activo: boolean;
}

/** Combo con el detalle de nombres de sus productos. */
interface ComboEnPantalla extends Combo {
  productosDetalle: Array<ComboProducto & { nombre: string }>;
}

/** Valores editables del formulario de combo. */
interface FormularioCombo {
  nombre: string;
  precio_fijo: number;
  incluye_entrada: boolean;
  activo: boolean;
  productos: ComboProducto[];
}

/** Pantalla de administración de cupones y combos. */
@Component({
  imports: [FormsModule],
  selector: 'app-admin-cupones',
  styleUrl: './admin-cupones.css',
  templateUrl: './admin-cupones.html',
})
export class AdminCupones implements OnInit {
  constructor(
    private readonly servicioCupones: Cupones,
    private readonly servicioCombos: Combos,
    private readonly servicioProductos: Productos,
  ) {}

  readonly pestana = signal<PestanaAdmin>('cupones');
  readonly cupones = signal<Cupon[]>([]);
  readonly combos = signal<ComboEnPantalla[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly idCuponEnEdicion = signal<string | null>(null);
  readonly idComboEnEdicion = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly filtroCupon = signal('');
  readonly filtroCombo = signal('');
  readonly formularioCupon: FormularioCupon = this.cuponVacio();
  readonly formularioCombo: FormularioCombo = this.comboVacio();

  /** Segmentos distintos existentes, ordenados, para sugerir en el formulario. */
  readonly segmentos = computed(() =>
    [...new Set(this.cupones().map((cupon) => cupon.segmento.trim()).filter(Boolean))].sort(
      (primero, segundo) => primero.localeCompare(segundo),
    ),
  );

  /** Cupones filtrados por código, descripción o segmento. */
  readonly cuponesFiltrados = computed(() => {
    const termino = this.filtroCupon().trim().toLocaleLowerCase();
    return this.cupones().filter(
      (cupon) =>
        cupon.codigo.toLocaleLowerCase().includes(termino) ||
        cupon.descripcion.toLocaleLowerCase().includes(termino) ||
        cupon.segmento.toLocaleLowerCase().includes(termino),
    );
  });

  /** Combos filtrados por nombre. */
  readonly combosFiltrados = computed(() => {
    const termino = this.filtroCombo().trim().toLocaleLowerCase();
    return this.combos().filter((combo) => combo.nombre.toLocaleLowerCase().includes(termino));
  });

  /** Productos disponibles para armar combos. */
  readonly productosActivos = computed(() => this.productos().filter((producto) => producto.activo));

  ngOnInit(): void {
    void this.cargarDatos();
  }

  /** Carga cupones, combos y productos, y arma el detalle de cada combo. */
  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const [cupones, combosBase, productosCombo, productos] = await Promise.all([
        this.servicioCupones.listar(),
        this.servicioCombos.listar(),
        this.servicioCombos.listarProductosCombo(),
        this.servicioProductos.listar(),
      ]);

      this.cupones.set(cupones);
      this.productos.set(productos);
      const porProducto = new Map(productos.map((producto) => [producto.id, producto]));
      const detallePorCombo = new Map<string, ComboProducto[]>();

      for (const relacion of productosCombo) {
        const detalle = detallePorCombo.get(relacion.combo_id) ?? [];
        detalle.push({ producto_id: relacion.producto_id, cantidad: relacion.cantidad });
        detallePorCombo.set(relacion.combo_id, detalle);
      }

      this.combos.set(
        combosBase.map((combo) => {
          const elementos = detallePorCombo.get(combo.id) ?? [];
          return {
            ...combo,
            productos: elementos,
            productosDetalle: elementos.map((elemento) => ({
              ...elemento,
              nombre: porProducto.get(elemento.producto_id)?.nombre ?? 'Producto no disponible',
            })),
          };
        }),
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Cambia de pestaña y limpia los mensajes. */
  cambiarPestana(pestana: PestanaAdmin): void {
    this.pestana.set(pestana);
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Limpia el formulario para crear un cupón. */
  nuevoCupon(): void {
    this.idCuponEnEdicion.set(null);
    Object.assign(this.formularioCupon, this.cuponVacio());
    this.limpiarFeedback();
  }

  /** Carga un cupón en el formulario para editarlo. */
  editarCupon(cupon: Cupon): void {
    this.idCuponEnEdicion.set(cupon.id);
    Object.assign(this.formularioCupon, {
      ...cupon,
      fecha_fin: cupon.fecha_fin ?? '',
      usos_maximo: cupon.usos_maximo,
    });
    this.limpiarFeedback();
  }

  /** Valida y guarda el cupón. */
  async guardarCupon(): Promise<void> {
    if (this.guardando()) return;

    const codigo = this.formularioCupon.codigo.trim().toUpperCase();
    const descripcion = this.formularioCupon.descripcion.trim();
    const segmento = this.formularioCupon.segmento.trim();
    const descuento = Number(this.formularioCupon.porcentaje_descuento);
    const usos = this.formularioCupon.usos_maximo;

    if (!codigo || !descripcion || !segmento || !this.formularioCupon.fecha_inicio) {
      this.error.set('Completá código, descripción, segmento y fecha de inicio.');
      return;
    }
    if (!Number.isFinite(descuento) || descuento <= 0 || descuento > 100) {
      this.error.set('El descuento debe ser mayor que 0 y no superar el 100%.');
      return;
    }
    if (this.formularioCupon.fecha_fin && this.formularioCupon.fecha_fin < this.formularioCupon.fecha_inicio) {
      this.error.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    if (usos !== null && (!Number.isInteger(Number(usos)) || Number(usos) < 1)) {
      this.error.set('Los usos máximos deben ser un entero positivo o quedar vacíos para no limitar.');
      return;
    }

    const datos: CuponInput = {
      codigo,
      descripcion,
      porcentaje_descuento: descuento,
      segmento,
      fecha_inicio: this.formularioCupon.fecha_inicio,
      fecha_fin: this.formularioCupon.fecha_fin || null,
      usos_maximo: usos === null || Number.isNaN(Number(usos)) ? null : Number(usos),
      activo: this.formularioCupon.activo,
    };

    this.guardando.set(true);
    this.limpiarFeedback();
    try {
      const id = this.idCuponEnEdicion();
      const guardado = id === null
        ? await this.servicioCupones.crear(datos)
        : await this.servicioCupones.actualizar(id, datos);
      this.cupones.update((actuales) =>
        id === null
          ? [...actuales, guardado].sort((primero, segundo) => primero.codigo.localeCompare(segundo.codigo))
          : actuales.map((elemento) => (elemento.id === guardado.id ? guardado : elemento)),
      );
      this.nuevoCupon();
      this.mensaje.set(id === null ? 'Cupón creado.' : 'Cupón actualizado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el cupón.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Activa o desactiva un cupón. */
  async cambiarEstadoCupon(cupon: Cupon, activo: boolean): Promise<void> {
    try {
      const actualizado = await this.servicioCupones.actualizarEstado(cupon.id, activo);
      this.cupones.update((actuales) =>
        actuales.map((elemento) => (elemento.id === actualizado.id ? actualizado : elemento)),
      );
      this.limpiarFeedback();
      this.mensaje.set(activo ? 'Cupón activado.' : 'Cupón desactivado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
    }
  }

  /** Elimina un cupón previa confirmación. */
  async eliminarCupon(cupon: Cupon): Promise<void> {
    if (!window.confirm(`¿Eliminar el cupón ${cupon.codigo}?`)) return;
    try {
      await this.servicioCupones.eliminar(cupon.id);
      this.cupones.update((actuales) => actuales.filter((elemento) => elemento.id !== cupon.id));
      if (this.idCuponEnEdicion() === cupon.id) this.nuevoCupon();
      this.limpiarFeedback();
      this.mensaje.set('Cupón eliminado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar el cupón.');
    }
  }

  /** Limpia el formulario para crear un combo. */
  nuevoCombo(): void {
    this.idComboEnEdicion.set(null);
    Object.assign(this.formularioCombo, this.comboVacio());
    this.limpiarFeedback();
  }

  /** Carga un combo en el formulario para editarlo. */
  editarCombo(combo: ComboEnPantalla): void {
    this.idComboEnEdicion.set(combo.id);
    Object.assign(this.formularioCombo, {
      nombre: combo.nombre,
      precio_fijo: combo.precio_fijo,
      incluye_entrada: combo.incluye_entrada,
      activo: combo.activo,
      productos: combo.productos.map((elemento) => ({ ...elemento })),
    });
    this.limpiarFeedback();
  }

  /** Agrega al combo el primer producto activo aún no incluido. */
  agregarProductoCombo(): void {
    const disponibles = this.productosActivos().filter(
      (producto) => !this.formularioCombo.productos.some((elemento) => elemento.producto_id === producto.id),
    );
    if (disponibles.length === 0) {
      this.error.set('No hay más productos activos disponibles para agregar.');
      return;
    }
    this.formularioCombo.productos.push({ producto_id: disponibles[0].id, cantidad: 1 });
    this.formularioCombo.productos = [...this.formularioCombo.productos];
    this.error.set(null);
  }

  /** Quita del combo el producto en la posición indicada. */
  quitarProductoCombo(indice: number): void {
    this.formularioCombo.productos = this.formularioCombo.productos.filter((_, posicion) => posicion !== indice);
  }

  /** Cambia el producto de una línea evitando repetidos. */
  cambiarProductoCombo(indice: number, productoId: string): void {
    const repetido = this.formularioCombo.productos.some(
      (elemento, posicion) => posicion !== indice && elemento.producto_id === productoId,
    );
    if (repetido) {
      this.error.set('Un producto no puede repetirse en el combo; modificá su cantidad.');
      return;
    }
    this.formularioCombo.productos[indice].producto_id = productoId;
    this.formularioCombo.productos = [...this.formularioCombo.productos];
    this.error.set(null);
  }

  /** Valida y guarda el combo; si falla la composición de un combo nuevo, lo elimina. */
  async guardarCombo(): Promise<void> {
    if (this.guardando()) return;
    const nombre = this.formularioCombo.nombre.trim();
    const precio = Number(this.formularioCombo.precio_fijo);
    const elementos = this.formularioCombo.productos;

    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      this.error.set('Completá el nombre y un precio fijo válido.');
      return;
    }
    if (elementos.some((elemento) => !elemento.producto_id || !Number.isInteger(Number(elemento.cantidad)) || Number(elemento.cantidad) < 1)) {
      this.error.set('Cada producto del combo debe tener una cantidad entera mayor que cero.');
      return;
    }
    if (elementos.length === 0 && !this.formularioCombo.incluye_entrada) {
      this.error.set('Agregá al menos un producto o indicá que el combo incluye una entrada.');
      return;
    }

    const datos: ComboInput = {
      nombre,
      precio_fijo: precio,
      incluye_entrada: this.formularioCombo.incluye_entrada,
      activo: this.formularioCombo.activo,
    };
    this.guardando.set(true);
    this.limpiarFeedback();
    try {
      const id = this.idComboEnEdicion();
      let comboId: string;
      if (id === null) {
        const creado = await this.servicioCombos.crear(datos);
        comboId = creado.id;
      } else {
        comboId = id;
        await this.servicioCombos.actualizar(comboId, datos);
      }

      try {
        await this.servicioCombos.reemplazarProductos(comboId, elementos);
      } catch (error) {
        if (id === null) await this.servicioCombos.eliminar(comboId);
        throw error;
      }

      const productosPorId = new Map(this.productos().map((producto) => [producto.id, producto]));
      const actualizado: ComboEnPantalla = {
        ...datos,
        id: comboId,
        productos: elementos.map((elemento) => ({ ...elemento })),
        productosDetalle: elementos.map((elemento) => ({
          ...elemento,
          nombre: productosPorId.get(elemento.producto_id)?.nombre ?? 'Producto no disponible',
        })),
      };
      this.combos.update((actuales) =>
        id === null
          ? [...actuales, actualizado].sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre))
          : actuales.map((elemento) => (elemento.id === comboId ? actualizado : elemento)),
      );
      this.nuevoCombo();
      this.mensaje.set(id === null ? 'Combo creado.' : 'Combo actualizado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el combo.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Activa o desactiva un combo. */
  async cambiarEstadoCombo(combo: Combo, activo: boolean): Promise<void> {
    try {
      await this.servicioCombos.actualizarEstado(combo.id, activo);
      this.combos.update((actuales) =>
        actuales.map((elemento) => (elemento.id === combo.id ? { ...elemento, activo } : elemento)),
      );
      this.limpiarFeedback();
      this.mensaje.set(activo ? 'Combo activado.' : 'Combo desactivado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
    }
  }

  /** Elimina un combo previa confirmación. */
  async eliminarCombo(combo: Combo): Promise<void> {
    if (!window.confirm(`¿Eliminar el combo “${combo.nombre}”?`)) return;
    try {
      await this.servicioCombos.eliminar(combo.id);
      this.combos.update((actuales) => actuales.filter((elemento) => elemento.id !== combo.id));
      if (this.idComboEnEdicion() === combo.id) this.nuevoCombo();
      this.limpiarFeedback();
      this.mensaje.set('Combo eliminado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar el combo.');
    }
  }

  /** Formatea un precio en pesos argentinos. */
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(precio);
  }

  /** Devuelve el nombre de un producto o un texto por defecto. */
  nombreProducto(id: string): string {
    return this.productos().find((producto) => producto.id === id)?.nombre ?? 'Elegir producto';
  }

  /** Borra los mensajes de error y éxito. */
  private limpiarFeedback(): void {
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Valores iniciales del cupón, con fecha de inicio de hoy. */
  private cuponVacio(): FormularioCupon {
    const hoy = new Date();
    const fechaLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);

    return {
      codigo: '',
      descripcion: '',
      porcentaje_descuento: 20,
      segmento: '',
      fecha_inicio: fechaLocal,
      fecha_fin: '',
      usos_maximo: null,
      activo: true,
    };
  }

  /** Valores iniciales del combo. */
  private comboVacio(): FormularioCombo {
    return {
      nombre: '',
      precio_fijo: 0,
      incluye_entrada: false,
      activo: true,
      productos: [],
    };
  }
}
