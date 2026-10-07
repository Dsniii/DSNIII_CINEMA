import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ReporteFacturacion } from '../models/reporte-facturacion';
import { Reportes as ServicioReportes } from '../servicios/reportes';
import { Reportes } from './reportes';

const reporte: ReporteFacturacion = {
  desde: '2020-02-28',
  hasta: '2020-02-28',
  dias: [
    {
      fecha: '2020-02-28',
      compras: 2,
      entradas: 5,
      subtotal: 14500.5,
      descuentos: 1000,
      credito: 0,
      facturado: 13500.5,
    },
  ],
  totales: { compras: 2, entradas: 5, subtotal: 14500.5, descuentos: 1000, credito: 0, facturado: 13500.5 },
  generadoEn: new Date(2020, 1, 28, 22, 0),
};

describe('Reportes', () => {
  let componente: Reportes;
  let fixture: ComponentFixture<Reportes>;
  let servicio: { obtenerFacturacion: ReturnType<typeof vi.fn> };

  /** Métodos protegidos que usa la plantilla. */
  type Interno = {
    elegirDesde(valor: string): void;
    elegirHasta(valor: string): void;
  };
  const interno = () => componente as unknown as Interno;

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(Reportes);
    componente = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botones = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'));

  beforeEach(async () => {
    servicio = { obtenerFacturacion: vi.fn(async () => reporte) };

    await TestBed.configureTestingModule({
      imports: [Reportes],
      providers: [{ provide: ServicioReportes, useValue: servicio }],
    }).compileComponents();
  });

  it('should create', async () => {
    await crear();
    expect(componente).toBeTruthy();
  });

  it('pide el reporte de hoy al abrir', async () => {
    await crear();
    const [desde, hasta] = servicio.obtenerFacturacion.mock.calls[0];
    expect(desde).toBe(hasta);
    expect(desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('muestra lo facturado y las entradas vendidas', async () => {
    await crear();
    expect(texto()).toContain('Facturado');
    expect(texto()).toContain('Entradas vendidas');
    expect(texto()).toContain('28/02/2020');
    expect(texto()).toMatch(/\$\s?13\.500,50/);
  });

  it('habilita la exportación solo cuando hay un reporte', async () => {
    servicio.obtenerFacturacion.mockRejectedValue(new Error('Sin permisos'));
    await crear();
    const exportar = botones().filter((boton) => boton.textContent?.includes('Exportar'));
    expect(exportar).toHaveLength(2);
    expect(exportar.every((boton) => boton.disabled)).toBe(true);
    expect(texto()).toContain('Sin permisos');
  });

  it('vuelve a consultar al cambiar las fechas y no consulta si el período es inválido', async () => {
    await crear();
    servicio.obtenerFacturacion.mockClear();

    interno().elegirDesde('2020-02-01');
    await fixture.whenStable();
    expect(servicio.obtenerFacturacion).toHaveBeenCalledTimes(1);

    servicio.obtenerFacturacion.mockClear();
    interno().elegirHasta('2020-01-01');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(servicio.obtenerFacturacion).not.toHaveBeenCalled();
    expect(texto()).toContain('no puede ser posterior');
  });
});
