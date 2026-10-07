import { EntradaVista } from '../models/estadisticas-dashboard';
import {
  MESES_VISIBLES,
  SEMANAS_VISIBLES,
  armarRankingPeliculas,
  armarRankingProductos,
  inicioDeSemana,
  inicioDeVentana,
} from './armar-estadisticas-dashboard';

/** "Hoy" de los tests: miércoles 7 de octubre de 2026. */
const AHORA = new Date(2026, 9, 7, 15, 0);

function vista(fecha: string, pelicula: string): EntradaVista {
  return { fecha, pelicula };
}

describe('inicioDeSemana', () => {
  it('devuelve el lunes, también cuando el día es domingo', () => {
    expect(inicioDeSemana(new Date(2026, 9, 7)).getDate()).toBe(5); // miércoles 7 → lunes 5
    expect(inicioDeSemana(new Date(2026, 9, 11)).getDate()).toBe(5); // domingo 11 → lunes 5
    expect(inicioDeSemana(new Date(2026, 9, 5)).getDate()).toBe(5); // lunes
  });
});

describe('armarRankingPeliculas', () => {
  const entradas = [
    vista('2026-10-05', 'Dune'),
    vista('2026-10-06', 'Dune'),
    vista('2026-10-07', 'Barbie'),
    vista('2026-10-02', 'Barbie'),
    vista('2026-10-03', 'Barbie'),
    vista('2026-10-01', 'Alien'),
    vista('2026-09-15', 'Dune'),
  ];

  it('agrupa por semana de lunes a domingo, de la actual hacia atrás', () => {
    const semanas = armarRankingPeliculas(entradas, 'semana', AHORA);

    expect(semanas).toHaveLength(SEMANAS_VISIBLES);
    expect(semanas[0].clave).toBe('2026-10-05');
    expect(semanas[0].etiqueta).toBe('Semana del 05/10 al 11/10/2026');
    expect(semanas[0].peliculas).toEqual([
      { nombre: 'Dune', entradas: 2 },
      { nombre: 'Barbie', entradas: 1 },
    ]);
    expect(semanas[0].total).toBe(3);

    // Semana anterior (28/09 al 04/10): Barbie 2, Alien 1.
    expect(semanas[1].clave).toBe('2026-09-28');
    expect(semanas[1].peliculas.map((p) => p.nombre)).toEqual(['Barbie', 'Alien']);
  });

  it('agrupa por mes y muestra también los meses sin entradas', () => {
    const meses = armarRankingPeliculas(entradas, 'mes', AHORA);

    expect(meses).toHaveLength(MESES_VISIBLES);
    expect(meses[0].clave).toBe('2026-10');
    expect(meses[0].etiqueta.toLowerCase()).toContain('octubre');
    expect(meses[0].peliculas).toEqual([
      { nombre: 'Barbie', entradas: 3 },
      { nombre: 'Dune', entradas: 2 },
      { nombre: 'Alien', entradas: 1 },
    ]);
    expect(meses[1].clave).toBe('2026-09');
    expect(meses[1].total).toBe(1);
    expect(meses[2].total).toBe(0);
  });

  it('desempata por nombre cuando hay la misma cantidad de entradas', () => {
    const meses = armarRankingPeliculas(
      [vista('2026-10-01', 'Zeta'), vista('2026-10-02', 'Alfa')],
      'mes',
      AHORA,
    );
    expect(meses[0].peliculas.map((p) => p.nombre)).toEqual(['Alfa', 'Zeta']);
  });

  it('ignora fechas inválidas y entradas fuera de la ventana', () => {
    const semanas = armarRankingPeliculas(
      [vista('no-es-fecha', 'X'), vista('2020-01-01', 'Vieja')],
      'semana',
      AHORA,
    );
    expect(semanas.every((semana) => semana.total === 0)).toBe(true);
  });
});

describe('inicioDeVentana', () => {
  it('cubre las semanas y los meses visibles', () => {
    const inicio = inicioDeVentana(AHORA);
    expect(inicio <= '2025-11-01').toBe(true);
    expect(inicio >= '2025-09-01').toBe(true);
  });
});

describe('armarRankingProductos', () => {
  it('suma las unidades por producto y ordena de mayor a menor', () => {
    const ranking = armarRankingProductos([
      { productoId: 'a', nombre: 'Gaseosa', cantidad: 2 },
      { productoId: 'b', nombre: 'Pochoclo', cantidad: 1 },
      { productoId: 'a', nombre: 'Gaseosa', cantidad: 3 },
      { productoId: 'c', nombre: 'Nachos', cantidad: 0 },
    ]);
    expect(ranking).toEqual([
      { productoId: 'a', nombre: 'Gaseosa', unidades: 5 },
      { productoId: 'b', nombre: 'Pochoclo', unidades: 1 },
    ]);
  });

  it('devuelve una lista vacía si no hay ventas', () => {
    expect(armarRankingProductos([])).toEqual([]);
  });
});
