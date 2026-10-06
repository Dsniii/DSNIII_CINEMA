import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriaProducto } from '../models/categoria';
import { Producto, ProductoInput } from '../models/producto';
import { Productos } from '../servicios/productos';
import { Recompensas } from '../../cupones-fidelizacion/servicios/recompensas';

/** Valores editables del formulario de producto. */
interface FormularioProducto {
  nombre: string;
  categoria_id: string;
  precio: number;
  imagen_path: string;
  activo: boolean;
  /** Puntos necesarios para canjear este producto. `null` = no es canjeable por puntos. */
  costo_puntos: number | null;
}

/** Pantalla de administración de productos, categorías de candy y sus recompensas por puntos. */
@Component({
  imports: [FormsModule],
  selector: 'app-admin-productos',
  styleUrl: './admin-productos.css',
  templateUrl: './admin-productos.html',
})
export class AdminProductos implements OnInit {
  constructor(
    private readonly servicioProductos: Productos,
    private readonly servicioRecompensas: Recompensas,
  ) {}

  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<CategoriaProducto[]>([]);
  /** Categoría usada como filtro, o null para ver todas. */
  readonly categoriaSeleccionada = signal<string | null>(null);
  readonly busqueda = signal('');
  /** Id del producto en edición, o null si se está creando uno. */
  readonly idEnEdicion = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly nuevaCategoriaNombre = signal('');
  readonly formulario: FormularioProducto = this.formularioVacio();

  /** Id de la recompensa fija "entrada gratis" (se carga una sola vez). */
  readonly entradaRecompensaId = signal<string | null>(null);
  /** Costo en puntos actual de la entrada gratis, editable en su propio mini-formulario. */
  readonly costoPuntosEntrada = signal(0);
  readonly guardandoEntrada = signal(false);

  /** Productos filtrados por categoría y texto. */
  readonly productosFiltrados = computed(() => {
    const categoriaId = this.categoriaSeleccionada();
    const termino = this.busqueda().trim().toLocaleLowerCase();

    return this.productos().filter((producto) => {
      const coincideCategoria = categoriaId === null || producto.categoria_id === categoriaId;
      return coincideCategoria && producto.nombre.toLocaleLowerCase().includes(termino);
    });
  });

  ngOnInit(): void {
    void this.cargarDatos();
  }

  /** Carga productos, categorías y la recompensa fija de entrada gratis. */
  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const [productos, categorias, entrada] = await Promise.all([
        this.servicioProductos.listar(),
        this.servicioProductos.listarCategorias(),
        this.servicioRecompensas.obtenerEntradaGratis(),
      ]);
      this.productos.set(productos);
      this.categorias.set(categorias);
      this.entradaRecompensaId.set(entrada.id);
      this.costoPuntosEntrada.set(entrada.costo_puntos);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Define la categoría usada como filtro. */
  seleccionarCategoria(id: string | null): void {
    this.categoriaSeleccionada.set(id);
  }

  /** Limpia el formulario para crear un producto. */
  nuevoProducto(): void {
    this.idEnEdicion.set(null);
    Object.assign(this.formulario, {
      ...this.formularioVacio(),
      categoria_id: this.categoriaSeleccionada() ?? this.categorias()[0]?.id ?? '',
    });
    this.error.set(null);
    this.mensaje.set(null);
  }

  /** Carga un producto en el formulario para editarlo, incluyendo su recompensa si tiene. */
  async editar(producto: Producto): Promise<void> {
    this.idEnEdicion.set(producto.id);
    Object.assign(this.formulario, {
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      precio: producto.precio,
      imagen_path: producto.imagen_path ?? '',
      activo: producto.activo,
      costo_puntos: null,
    });
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const recompensa = await this.servicioRecompensas.obtenerPorProducto(producto.id);
      this.formulario.costo_puntos = recompensa?.costo_puntos ?? null;
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo cargar la recompensa del producto.',
      );
    }
  }

  /** Valida y guarda el producto junto con su recompensa por puntos (si tiene). */
  async guardar(): Promise<void> {
    if (this.guardando()) return;

    const nombre = this.formulario.nombre.trim();
    const precio = Number(this.formulario.precio);
    const costoPuntos =
      this.formulario.costo_puntos === null || this.formulario.costo_puntos === undefined
        ? null
        : Number(this.formulario.costo_puntos);

    if (!nombre || !this.formulario.categoria_id || !Number.isFinite(precio) || precio < 0) {
      this.error.set('Completá nombre y categoría, e ingresá un precio válido.');
      return;
    }
    if (costoPuntos !== null && (!Number.isInteger(costoPuntos) || costoPuntos < 0)) {
      this.error.set('El costo en puntos debe ser un número entero positivo, o dejarlo vacío.');
      return;
    }

    const datos: ProductoInput = {
      nombre,
      categoria_id: this.formulario.categoria_id,
      precio,
      imagen_path: this.formulario.imagen_path.trim() || null,
      activo: this.formulario.activo,
    };

    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const id = this.idEnEdicion();
      const producto = id === null
        ? await this.servicioProductos.crear(datos)
        : await this.servicioProductos.actualizar(id, datos);

      await this.servicioRecompensas.guardarParaProducto(producto.id, producto.nombre, costoPuntos);

      this.productos.update((actuales) =>
        id === null
          ? [...actuales, producto].sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre))
          : actuales.map((elemento) => (elemento.id === producto.id ? producto : elemento)),
      );
      this.nuevoProducto();
      this.mensaje.set(id === null ? 'Producto creado.' : 'Producto actualizado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Activa o desactiva un producto. */
  async cambiarEstado(producto: Producto, activo: boolean): Promise<void> {
    try {
      const actualizado = await this.servicioProductos.actualizarEstado(producto.id, activo);
      this.productos.update((actuales) =>
        actuales.map((elemento) => (elemento.id === actualizado.id ? actualizado : elemento)),
      );
      this.error.set(null);
      this.mensaje.set(activo ? 'Producto activado.' : 'Producto desactivado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
    }
  }

  /** Elimina un producto previa confirmación, borrando antes su recompensa (si tiene) para no chocar con la FK. */
  async eliminarProducto(producto: Producto): Promise<void> {
    if (!window.confirm(`¿Eliminar “${producto.nombre}”? Esta acción no se puede deshacer.`)) return;

    try {
      await this.servicioRecompensas.eliminarPorProducto(producto.id);
      await this.servicioProductos.eliminar(producto.id);
      this.productos.update((actuales) => actuales.filter((elemento) => elemento.id !== producto.id));
      if (this.idEnEdicion() === producto.id) this.nuevoProducto();
      this.mensaje.set('Producto eliminado.');
      this.error.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar el producto.');
    }
  }

  /** Crea una categoría con el nombre ingresado. */
  async crearCategoria(): Promise<void> {
    const nombre = this.nuevaCategoriaNombre().trim();
    if (!nombre) {
      this.error.set('Escribí el nombre de la categoría.');
      return;
    }

    try {
      const categoria = await this.servicioProductos.crearCategoria(nombre);
      this.categorias.update((actuales) =>
        [...actuales, categoria].sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre)),
      );
      this.nuevaCategoriaNombre.set('');
      this.categoriaSeleccionada.set(categoria.id);
      this.formulario.categoria_id = categoria.id;
      this.mensaje.set('Categoría creada.');
      this.error.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo crear la categoría.');
    }
  }

  /** Elimina una categoría si no tiene productos asociados. */
  async eliminarCategoria(categoria: CategoriaProducto): Promise<void> {
    const asociados = this.productos().filter((producto) => producto.categoria_id === categoria.id);
    if (asociados.length > 0) {
      this.error.set(`No se puede eliminar “${categoria.nombre}”: tiene ${asociados.length} producto(s) asociado(s).`);
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría “${categoria.nombre}”?`)) return;

    try {
      await this.servicioProductos.eliminarCategoria(categoria.id);
      this.categorias.update((actuales) => actuales.filter((elemento) => elemento.id !== categoria.id));
      if (this.categoriaSeleccionada() === categoria.id) this.categoriaSeleccionada.set(null);
      if (this.formulario.categoria_id === categoria.id) this.formulario.categoria_id = '';
      this.mensaje.set('Categoría eliminada.');
      this.error.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar la categoría.');
    }
  }

  /** Guarda únicamente el nuevo costo en puntos de la recompensa fija de entrada gratis. */
  async guardarCostoEntrada(): Promise<void> {
    const id = this.entradaRecompensaId();
    const costo = Number(this.costoPuntosEntrada());

    if (!id) return;
    if (!Number.isInteger(costo) || costo <= 0) {
      this.error.set('Ingresá un costo en puntos válido para la entrada gratis.');
      return;
    }

    this.guardandoEntrada.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const actualizada = await this.servicioRecompensas.actualizarCostoEntrada(id, costo);
      this.costoPuntosEntrada.set(actualizada.costo_puntos);
      this.mensaje.set('Costo de la entrada gratis actualizado.');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo actualizar el costo de la entrada.',
      );
    } finally {
      this.guardandoEntrada.set(false);
    }
  }

  /** Devuelve el nombre de una categoría o un texto por defecto. */
  nombreCategoria(id: string): string {
    return this.categorias().find((categoria) => categoria.id === id)?.nombre ?? 'Sin categoría';
  }

  /** Formatea un precio en pesos argentinos. */
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(precio);
  }

  /** Valores iniciales del formulario. */
  private formularioVacio(): FormularioProducto {
    return {
      nombre: '',
      categoria_id: '',
      precio: 0,
      imagen_path: '',
      activo: true,
      costo_puntos: null,
    };
  }
}