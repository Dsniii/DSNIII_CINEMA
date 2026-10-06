import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoriaProducto } from '../models/categoria';
import { Producto, ProductoInput } from '../models/producto';
import { Productos } from '../servicios/productos';
import { Recompensa } from '../../cupones-fidelizacion/models/recompensa';
import { Recompensas } from '../../cupones-fidelizacion/servicios/recompensas';
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

    await TestBed.configureTestingModule({
      imports: [AdminProductos],
      providers: [
        { provide: Productos, useValue: servicioProductos },
        { provide: Recompensas, useValue: servicioRecompensas },
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

  it('al eliminar un producto, borra antes su recompensa para no chocar con la FK', async () => {
    await componente.eliminarProducto(producto);

    expect(servicioRecompensas.eliminarPorProducto).toHaveBeenCalledWith(producto.id);
    expect(servicioProductos.eliminar).toHaveBeenCalledWith(producto.id);
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