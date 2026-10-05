import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoriaProducto } from '../models/categoria';
import { Producto, ProductoInput } from '../models/producto';
import { Productos } from '../servicios/productos';
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

  const categoria: CategoriaProducto = { id: 'category-1', nombre: 'Pochoclos' };
  const producto: Producto = {
    id: 'product-1',
    nombre: 'Pochoclo chico',
    categoria_id: categoria.id,
    precio: 1800,
    imagen_path: null,
    activo: true,
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

    await TestBed.configureTestingModule({
      imports: [AdminProductos],
      providers: [{ provide: Productos, useValue: servicioProductos }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductos);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('carga productos y categorías', async () => {
    await componente.cargarDatos();

    expect(componente.productos()).toEqual([producto]);
    expect(componente.categorias()).toEqual([categoria]);
  });

  it('crea un producto con la categoría elegida y valores normalizados', async () => {
    Object.assign(componente.formulario, {
      nombre: '  Pochoclo mediano ',
      categoria_id: categoria.id,
      precio: 2300,
      imagen_path: ' https://example.com/pochoclo.jpg ',
      activo: true,
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
