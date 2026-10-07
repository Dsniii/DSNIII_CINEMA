import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { claveDeDia } from '../utils/armar-reporte-facturacion';
import { EntradaVista, VentaProducto } from '../models/estadisticas-dashboard';
import { EstadisticasDashboard } from '../servicios/estadisticas-dashboard';
import { Tablero } from './dashboard';

/** Día de hoy: las entradas de prueba se compraron hoy. */
const hoy = claveDeDia(new Date());

function entradas(pelicula: string, cantidad: number): EntradaVista[] {
  return Array.from({ length: cantidad }, () => ({ fecha: hoy, pelicula }));
}

describe('Tablero', () => {
  let componente: Tablero;
  let fixture: ComponentFixture<Tablero>;
  let servicio: {
    obtenerEntradasVendidas: ReturnType<typeof vi.fn>;
    obtenerVentasProductos: ReturnType<typeof vi.fn>;
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(Tablero);
    componente = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    servicio = {
      obtenerEntradasVendidas: vi.fn(async () => [
        ...entradas('Dune', 3),
        ...entradas('Barbie', 1),
      ]),
      obtenerVentasProductos: vi.fn(
        async (): Promise<VentaProducto[]> => [
          { productoId: 'p1', nombre: 'Pochoclo grande', cantidad: 4 },
          { productoId: 'p2', nombre: 'Gaseosa', cantidad: 2 },
          { productoId: 'p1', nombre: 'Pochoclo grande', cantidad: 3 },
        ],
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Tablero],
      providers: [{ provide: EstadisticasDashboard, useValue: servicio }],
    }).compileComponents();
  });

  it('should create', async () => {
    await crear();
    expect(componente).toBeTruthy();
  });

  it('muestra el producto del candy bar más vendido', async () => {
    await crear();
    expect(texto()).toContain('Pochoclo grande');
    expect(texto()).toContain('7 unidades vendidas');
  });

  it('dibuja los gráficos semanal y mensual con las películas más vistas', async () => {
    await crear();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('.grafico')).toHaveLength(2);
    expect(texto()).toContain('Películas más vistas por semana');
    expect(texto()).toContain('Películas más vistas por mes');
    expect(texto()).toContain('Dune');
    expect(texto()).toContain('4 entradas en total');
    // La película más vista ocupa todo el ancho y la otra, un tercio.
    const anchos = Array.from(html.querySelectorAll<HTMLElement>('.barra-relleno')).map(
      (barra) => barra.style.width,
    );
    expect(anchos.slice(0, 2)).toEqual(['100%', '33%']);
  });

  it('avisa si no hay datos y si falla la carga', async () => {
    servicio.obtenerEntradasVendidas.mockRejectedValue(new Error('permission denied'));
    servicio.obtenerVentasProductos.mockResolvedValue([]);
    await crear();
    expect(texto()).toContain('permission denied');
    expect(texto()).toContain('Todavía no hay ventas de productos.');
    expect(texto()).toContain('No se vendieron entradas');
  });
});
