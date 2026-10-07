import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoriaProducto } from '../models/categoria';
import { Producto, ProductoInput } from '../models/producto';
import { Productos } from '../servicios/productos';
import { Recompensa } from '../../cupones-fidelizacion/models/recompensa';
import { Recompensas } from '../../cupones-fidelizacion/servicios/recompensas';
import { LogActividad } from '../../admin/servicios/log-actividad';
import { AdminProductos } from './admin-productos';

describe('AdminProductos', () => {
  let componente: AdminProductos;
  let fixture: ComponentFixture<AdminProductos>;
  let servicioProductos: {
    listar: ReturnType<typeof vi.fn>;
    listarCategorias: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    actualizarEstado: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
    crearCategoria: ReturnType<typeof vi.fn>;
    eliminarCategoria: ReturnType<typeof vi.fn>;
  };
  let servicioRecompensas: {
    obtenerEntradaGratis: ReturnType<typeof vi.fn>;
    obtenerPorProducto: ReturnType<typeof vi.fn>;
    guardarParaProducto: ReturnType<typeof vi.fn>;
    eliminarPorProducto: ReturnType<typeof vi.fn>;
    actualizarCostoEntrada: ReturnType<typeof vi.fn>;
  };
  let servicioLog: { registrar: ReturnType<typeof vi.fn> };

  const categoria: CategoriaProducto = { id: 'category-1', nombre: 'Pochoclos' };
  const producto: Producto = {
    id: 'product-1',
    nombre: 'Pochoclo chico',
    categoria_id: categoria.id,
    precio: 1800,
    imagen_path: null,
    activo: true,
  };
  const entradaGratis: Recompensa = {
    id: 'reward-entrada',
    nombre: 'Entrada gratis',
    tipo: 'entrada',
    producto_id: null,
    costo_puntos: 500,
  };

  beforeEach(async () => {
    servicioProductos = {
      listar: vi.fn().mockResolvedValue([producto]),
      listarCategorias: vi.fn().mockResolvedValue([categoria]),
      crear: vi.fn<(datos: ProductoInput) => Promise<Producto>>().mockResolvedValue(producto),
      actualizar: vi.fn().mockResolvedValue(producto),
      actualizarEstado: vi.fn().mockResolvedValue({ ...producto, activo: false }),
      eliminar: vi.fn().mockResolvedValue(undefined),
      crearCategoria: vi.fn().mockResolvedValue({ id: 'category-2', nombre: 'Bebidas' }),
      eliminarCategoria: vi.fn().mockResolvedValue(undefined),
    };

    servicioRecompensas = {
      obtenerEntradaGratis: vi.fn().mockResolvedValue(entradaGratis),
      obtenerPorProducto: vi.fn().mockResolvedValue(null),
      guardarParaProducto: vi.fn().mockResolvedValue(null),
      eliminarPorProducto: vi.fn().mockResolvedValue(undefined),
      actualizarCostoEntrada: vi.fn().mockResolvedValue({ ...entradaGratis, costo_puntos: 650 }),
    };

    servicioLog = {
      registrar: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AdminProductos],
      providers: [
        { provide: Productos, useValue: servicioProductos },
        { provide: Recompensas, useValue: servicioRecompensas },
        { provide: LogActividad, useValue: servicioLog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductos);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('carga productos, categorías y el costo actual de la entrada gratis', async () => {
    await componente.cargarDatos();

    expect(componente.productos()).toEqual([producto]);
    expect(componente.categorias()).toEqual([categoria]);
    expect(componente.costoPuntosEntrada()).toBe(500);
  });

  it('crea un producto con la categoría elegida y valores normalizados', async () => {
    Object.assign(componente.formulario, {
      nombre: '  Pochoclo mediano ',
      categoria_id: categoria.id,
      precio: 2300,
      imagen_path: ' https://example.com/pochoclo.jpg ',
      activo: true,
      costo_puntos: null,
    });

    await componente.guardar();

    expect(servicioProductos.crear).toHaveBeenCalledWith({
      nombre: 'Pochoclo mediano',
      categoria_id: categoria.id,
      precio: 2300,
      imagen_path: 'https://example.com/pochoclo.jpg',
      activo: true,
    });
    expect(componente.productos()).toContain(producto);
  });

  it('al crear un producto, registra la actividad', async () => {
    Object.assign(componente.formulario, {
      nombre: 'Pochoclo mediano',
      categoria_id: categoria.id,
      precio: 2300,
      imagen_path: '',
      activo: true,
      costo_puntos: null,
    });

    await componente.guardar();

    expect(servicioLog.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'crear_producto', entidad: 'productos', entidadId: producto.id }),
    );
  });

  it('al guardar un producto con puntos, crea o actualiza su recompensa', async () => {
    Object.assign(componente.formulario, {
      nombre: 'Pochoclo mediano',
      categoria_id: categoria.id,
      precio: 2300,
      imagen_path: '',
      activo: true,
      costo_puntos: 150,
    });

    await componente.guardar();

    expect(servicioRecompensas.guardarParaProducto).toHaveBeenCalledWith(
      producto.id,
      producto.nombre,
      150,
    );
  });

  it('al editar un producto, carga el costo en puntos de su recompensa existente', async () => {
    servicioRecompensas.obtenerPorProducto.mockResolvedValue({
      id: 'reward-1',
      nombre: producto.nombre,
      tipo: 'producto',
      producto_id: producto.id,
      costo_puntos: 150,
    } satisfies Recompensa);

    await componente.editar(producto);

    expect(servicioRecompensas.obtenerPorProducto).toHaveBeenCalledWith(producto.id);
    expect(componente.formulario.costo_puntos).toBe(150);
  });

  it('al cambiar el precio de un producto, registra el valor anterior y el nuevo', async () => {
    await componente.cargarDatos();
    await componente.editar(producto);
    componente.formulario.precio = 2100;
    servicioProductos.actualizar.mockResolvedValueOnce({ ...producto, precio: 2100 });

    await componente.guardar();

    expect(servicioLog.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'modificar_precio_producto',
        entidad: 'productos',
        entidadId: producto.id,
        detalle: expect.stringContaining('Pochoclo chico'),
      }),
    );
  });

  it('si el precio no cambia, no registra un cambio de precio', async () => {
    await componente.cargarDatos();
    await componente.editar(producto);

    await componente.guardar();

    const acciones = servicioLog.registrar.mock.calls.map(([evento]) => evento.accion);
    expect(acciones).toContain('actualizar_producto');
    expect(acciones).not.toContain('modificar_precio_producto');
  });

  it('al eliminar un producto, borra antes su recompensa y registra la actividad', async () => {
    await componente.eliminarProducto(producto);

    expect(servicioRecompensas.eliminarPorProducto).toHaveBeenCalledWith(producto.id);
    expect(servicioProductos.eliminar).toHaveBeenCalledWith(producto.id);
    expect(servicioLog.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'eliminar_producto', entidad: 'productos', entidadId: producto.id }),
    );
  });

  it('guarda el nuevo costo en puntos de la entrada gratis', async () => {
    await componente.cargarDatos();
    componente.costoPuntosEntrada.set(650);

    await componente.guardarCostoEntrada();

    expect(servicioRecompensas.actualizarCostoEntrada).toHaveBeenCalledWith('reward-entrada', 650);
    expect(componente.costoPuntosEntrada()).toBe(650);
  });

  it('filtra el catálogo por categoría y texto de búsqueda', async () => {
    const bebida: Producto = { ...producto, id: 'product-2', nombre: 'Gaseosa', categoria_id: 'category-2' };
    componente.productos.set([producto, bebida]);
    componente.seleccionarCategoria(categoria.id);

    expect(componente.productosFiltrados()).toEqual([producto]);

    componente.seleccionarCategoria(null);
    componente.busqueda.set('gase');
    expect(componente.productosFiltrados()).toEqual([bebida]);
  });

  it('no elimina categorías que aún tienen productos', async () => {
    await componente.eliminarCategoria(categoria);

    expect(servicioProductos.eliminarCategoria).not.toHaveBeenCalled();
    expect(componente.error()).toContain('producto(s) asociado(s)');
  });
});