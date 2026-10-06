import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PeliculaProxima } from '../models/pelicula';
import { ProximosEstrenos } from '../servicios/proximos-estrenos';
import { Proximamente } from './proximamente';

// Hoy (fijo): 6 de octubre de 2026.
const conPreventaAbierta: PeliculaProxima = {
  nombre: 'Película A',
  imagen_path: 'https://ejemplo.com/a.jpg',
  fecha_estreno: '2026-10-10',
  dias_preventa: 7,
};

const conPreventaFutura: PeliculaProxima = {
  nombre: 'Película B',
  imagen_path: null,
  fecha_estreno: '2026-10-20',
  dias_preventa: 7,
};

const sinPreventa: PeliculaProxima = {
  nombre: 'Película C',
  imagen_path: null,
  fecha_estreno: '2026-11-01',
  dias_preventa: 0,
};

async function crearComponente(listar: () => Promise<PeliculaProxima[]>) {
  await TestBed.configureTestingModule({
    imports: [Proximamente],
    providers: [{ provide: ProximosEstrenos, useValue: { listar } }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Proximamente);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('Proximamente', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería crearse', async () => {
    const fixture = await crearComponente(() => Promise.resolve([]));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra nombre, fecha de estreno e imagen de cada película', async () => {
    const fixture = await crearComponente(() => Promise.resolve([conPreventaAbierta, sinPreventa]));
    const tarjetas = fixture.nativeElement.querySelectorAll('.movie-card');

    expect(tarjetas.length).toBe(2);
    expect(tarjetas[0].textContent).toContain('Película A');
    expect(tarjetas[0].textContent).toContain('10 de octubre de 2026');
    expect(tarjetas[0].querySelector('img').getAttribute('src')).toBe('https://ejemplo.com/a.jpg');
    expect(tarjetas[1].querySelector('img')).toBeNull();
  });

  it('muestra "Preventa disponible" cuando la preventa ya abrió', async () => {
    const fixture = await crearComponente(() => Promise.resolve([conPreventaAbierta]));
    expect(fixture.nativeElement.querySelector('.presale-badge').textContent).toContain(
      'Preventa disponible',
    );
  });

  it('muestra desde cuándo habrá preventa si todavía no abrió', async () => {
    const fixture = await crearComponente(() => Promise.resolve([conPreventaFutura]));

    expect(fixture.nativeElement.querySelector('.presale-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.presale-note').textContent).toContain(
      'Preventa desde el 13 de octubre',
    );
  });

  it('indica que no hay preventa cuando dias_preventa es 0', async () => {
    const fixture = await crearComponente(() => Promise.resolve([sinPreventa]));
    expect(fixture.nativeElement.querySelector('.presale-note').textContent).toContain(
      'Sin preventa',
    );
  });

  it('muestra un aviso cuando no hay estrenos', async () => {
    const fixture = await crearComponente(() => Promise.resolve([]));
    expect(fixture.nativeElement.textContent).toContain('No hay estrenos próximos');
  });

  it('muestra un error y permite reintentar si falla la carga', async () => {
    const listar = vi
      .fn<() => Promise<PeliculaProxima[]>>()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce([conPreventaAbierta]);
    const fixture = await crearComponente(listar);

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Película A');
  });
});