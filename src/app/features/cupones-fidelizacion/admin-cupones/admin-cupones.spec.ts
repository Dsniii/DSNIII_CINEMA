import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Producto } from '../../candy/models/producto';
import { Productos } from '../../candy/servicios/productos';
import { Combo } from '../models/combo';
import { Cupon } from '../models/cupon';
import { Combos } from '../servicios/combos';
import { Cupones } from '../servicios/cupones';
import { AdminCupones } from './admin-cupones';

describe('AdminCupones', () => {
  let componente: AdminCupones;
  let fixture: ComponentFixture<AdminCupones>;
  let servicioCupones: Record<string, ReturnType<typeof vi.fn>>;
  let servicioCombos: Record<string, ReturnType<typeof vi.fn>>;
  let servicioProductos: { listar: ReturnType<typeof vi.fn> };

  const cupon: Cupon = {
    id: 'coupon-1',
    codigo: 'BIENVENIDA',
    descripcion: 'Primera compra',
    porcentaje_descuento: 20,
    segmento: 'Primera compra',
    fecha_inicio: '2026-01-01',
    fecha_fin: null,
    usos_maximo: null,
    activo: true,
  };
  const producto: Producto = {
    id: 'product-1',
    nombre: 'Pochoclo mediano',
    categoria_id: 'category-1',
    precio: 2300,
    imagen_path: null,
    activo: true,
  };
  const combo: Combo = {
    id: 'combo-1',
    nombre: 'Combo Duo',
    precio_fijo: 6500,
    incluye_entrada: false,
    activo: true,
    productos: [{ producto_id: producto.id, cantidad: 2 }],
  };

  beforeEach(async () => {
    servicioCupones = {
      listar: vi.fn().mockResolvedValue([cupon]),
      crear: vi.fn().mockImplementation(async (datos) => ({ ...datos, id: 'coupon-2' })),
      actualizar: vi.fn().mockImplementation(async (id, datos) => ({ ...datos, id })),
      actualizarEstado: vi.fn().mockImplementation(async (id, activo) => ({ ...cupon, id, activo })),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };
    servicioCombos = {
      listar: vi.fn().mockResolvedValue([{ ...combo, productos: undefined }]),
      listarProductosCombo: vi.fn().mockResolvedValue([
        { combo_id: combo.id, producto_id: producto.id, cantidad: 2 },
      ]),
      crear: vi.fn().mockResolvedValue({ id: 'combo-2' }),
      actualizar: vi.fn().mockResolvedValue(undefined),
      actualizarEstado: vi.fn().mockResolvedValue(undefined),
      reemplazarProductos: vi.fn().mockResolvedValue(undefined),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };
    servicioProductos = { listar: vi.fn().mockResolvedValue([producto]) };

    await TestBed.configureTestingModule({
      imports: [AdminCupones],
      providers: [
        { provide: Cupones, useValue: servicioCupones },
        { provide: Combos, useValue: servicioCombos },
        { provide: Productos, useValue: servicioProductos },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCupones);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('carga cupones, combos y nombres de productos de cada combo', async () => {
    await componente.cargarDatos();

    expect(componente.cupones()).toEqual([cupon]);
    expect(componente.combos()[0].productosDetalle).toEqual([
      { producto_id: producto.id, cantidad: 2, nombre: producto.nombre },
    ]);
  });

  it('crea un cupón con un segmento nuevo de texto libre', async () => {
    Object.assign(componente.formularioCupon, {
      codigo: '  VERANO26 ',
      descripcion: 'Promo de verano',
      porcentaje_descuento: 15,
      segmento: 'Estudiantes',
      fecha_inicio: '2026-10-01',
      fecha_fin: '',
      usos_maximo: null,
      activo: true,
    });

    await componente.guardarCupon();

    expect(servicioCupones['crear']).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'VERANO26', segmento: 'Estudiantes', fecha_fin: null }),
    );
    expect(componente.cupones().some((elemento) => elemento.segmento === 'Estudiantes')).toBe(true);
  });

  it('guarda las propiedades del combo y las cantidades de sus productos', async () => {
    Object.assign(componente.formularioCombo, {
      nombre: ' Combo Familiar ',
      precio_fijo: 7200,
      incluye_entrada: true,
      activo: true,
      productos: [{ producto_id: producto.id, cantidad: 3 }],
    });

    await componente.guardarCombo();

    expect(servicioCombos['crear']).toHaveBeenCalledWith({
      nombre: 'Combo Familiar',
      precio_fijo: 7200,
      incluye_entrada: true,
      activo: true,
    });
    expect(servicioCombos['reemplazarProductos']).toHaveBeenCalledWith('combo-2', [
      { producto_id: producto.id, cantidad: 3 },
    ]);
  });
});
