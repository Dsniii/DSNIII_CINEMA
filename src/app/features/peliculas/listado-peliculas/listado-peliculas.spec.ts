import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Genero, PeliculaGenero } from '../models/genero';
import { PeliculaCartelera } from '../models/pelicula';
import { Cartelera } from '../servicios/cartelera';
import { ListadoPeliculas } from './listado-peliculas';

// Hoy (fijo): 6 de octubre de 2026.
const estrenada: PeliculaCartelera = {
  id: 'a',
  nombre: 'Ámbar',
  imagen_path: 'https://ejemplo.com/a.jpg',
  restriccion_edad: 13,
  fecha_estreno: '2026-09-01',
  dias_preventa: 0,
};
const preventaAbierta: PeliculaCartelera = {
  id: 'b',
  nombre: 'Brújula',
  imagen_path: null,
  restriccion_edad: 0,
  fecha_estreno: '2026-10-10',
  dias_preventa: 7,
};
const preventaFutura: PeliculaCartelera = {
  id: 'c',
  nombre: 'Cometa',
  imagen_path: null,
  restriccion_edad: 0,
  fecha_estreno: '2026-10-20',
  dias_preventa: 7,
};
const estrenoSinPreventa: PeliculaCartelera = {
  id: 'd',
  nombre: 'Delta',
  imagen_path: null,
  restriccion_edad: 18,
  fecha_estreno: '2026-10-08',
  dias_preventa: 0,
};

const generos: Genero[] = [
  { id: 'g1', nombre: 'Acción' },
  { id: 'g2', nombre: 'Drama' },
  { id: 'g3', nombre: 'Terror' },
];
const relaciones: PeliculaGenero[] = [
  { pelicula_id: 'a', genero_id: 'g1' },
  { pelicula_id: 'a', genero_id: 'g2' },
  { pelicula_id: 'b', genero_id: 'g2' },
  { pelicula_id: 'c', genero_id: 'g3' },
];

interface Servicio {
  listarActivas: () => Promise<PeliculaCartelera[]>;
  listarGeneros: () => Promise<{ generos: Genero[]; relaciones: PeliculaGenero[] }>;
  masVendidas: () => Promise<string[]>;
}

async function crearComponente(parcial: Partial<Servicio> = {}) {
  const servicio: Servicio = {
    listarActivas: () => Promise.resolve([estrenada, preventaAbierta, preventaFutura, estrenoSinPreventa]),
    listarGeneros: () => Promise.resolve({ generos, relaciones }),
    masVendidas: () => Promise.resolve([]),
    ...parcial,
  };

  await TestBed.configureTestingModule({
    imports: [ListadoPeliculas],
    providers: [{ provide: Cartelera, useValue: servicio }],
  }).compileComponents();

  const fixture = TestBed.createComponent(ListadoPeliculas);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function nombresEnGrilla(fixture: { nativeElement: HTMLElement }): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.movie-grid .movie-info h3')).map(
    (el) => el.textContent?.trim() ?? '',
  );
}

describe('ListadoPeliculas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería crearse', async () => {
    const fixture = await crearComponente();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra las estrenadas y las que ya abrieron la preventa, y oculta el resto', async () => {
    const fixture = await crearComponente();
    // Brújula (preventa abierta) y Ámbar (estrenada); Cometa (preventa futura) y Delta (estreno en 2 días sin preventa) no.
    expect(nombresEnGrilla(fixture)).toEqual(['Brújula', 'Ámbar']);
  });

  it('marca como preventa las que todavía no se estrenaron', async () => {
    const fixture = await crearComponente();
    const etiquetas = fixture.nativeElement.querySelectorAll('.presale-tag');

    expect(etiquetas.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.movie-date').textContent).toContain('10 de octubre');
  });

  it('busca por nombre sin importar mayúsculas ni tildes', async () => {
    const fixture = await crearComponente();
    const entrada: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');

    entrada.value = 'AMBAR';
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(nombresEnGrilla(fixture)).toEqual(['Ámbar']);
  });

  it('filtra por género, incluso si la película tiene varios', async () => {
    const fixture = await crearComponente();
    const chips: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.genre-chip'));
    const chipDrama = chips.find((c) => c.textContent?.trim() === 'Drama');

    chipDrama?.click();
    fixture.detectChanges();
    expect(nombresEnGrilla(fixture)).toEqual(['Brújula', 'Ámbar']);

    const chipAccion = chips.find((c) => c.textContent?.trim() === 'Acción');
    chipAccion?.click();
    fixture.detectChanges();
    expect(nombresEnGrilla(fixture)).toEqual(['Ámbar']);
  });

  it('no ofrece géneros que no tienen películas disponibles', async () => {
    const fixture = await crearComponente();
    const textos = Array.from(fixture.nativeElement.querySelectorAll('.genre-chip')).map((c) =>
      (c as HTMLElement).textContent?.trim(),
    );

    // "Terror" solo tiene a Cometa, que todavía no se puede comprar.
    expect(textos).toEqual(['Todos', 'Acción', 'Drama']);
  });

  it('muestra las más vendidas en orden y sin películas no disponibles', async () => {
    const fixture = await crearComponente({
      masVendidas: () => Promise.resolve(['a', 'c', 'b']),
    });
    const nombres = Array.from(fixture.nativeElement.querySelectorAll('.top-grid .movie-info h3')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );

    expect(nombres).toEqual(['Ámbar', 'Brújula']);
    expect(fixture.nativeElement.querySelector('.rank').textContent).toContain('1');
  });

  it('oculta "Más vendidas" cuando no hay ranking', async () => {
    const fixture = await crearComponente();
    expect(fixture.nativeElement.querySelector('.top')).toBeNull();
  });

  it('muestra la cartelera aunque fallen los géneros y el ranking', async () => {
    const fixture = await crearComponente({
      listarGeneros: () => Promise.reject(new Error('falló')),
      masVendidas: () => Promise.reject(new Error('falló')),
    });

    expect(nombresEnGrilla(fixture)).toEqual(['Brújula', 'Ámbar']);
    expect(fixture.nativeElement.querySelector('.genre-filter')).toBeNull();
    expect(fixture.nativeElement.querySelector('.top')).toBeNull();
  });

  it('el botón Comprar lleva a la selección de butacas de esa película', async () => {
    const fixture = await crearComponente();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.nativeElement.querySelector('.movie-grid .buy-button').click();

    expect(navegar).toHaveBeenCalledWith(['/compra/seleccion-butacas'], {
      queryParams: { pelicula: 'b' },
    });
  });

  it('muestra un error y permite reintentar si fallan las películas', async () => {
    const listarActivas = vi
      .fn<() => Promise<PeliculaCartelera[]>>()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce([estrenada]);
    const fixture = await crearComponente({ listarActivas });

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(nombresEnGrilla(fixture)).toEqual(['Ámbar']);
  });
});