import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { Autenticacion } from '../../../core/services/auth';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { Butaca } from '../../salas-funciones/models/butaca';
import { Funcion } from '../../salas-funciones/models/funcion';
import { Butacas } from '../../salas-funciones/servicios/butacas';
import { Funciones } from '../../salas-funciones/servicios/funciones';
import { Salas } from '../../salas-funciones/servicios/salas';
import { CompraEnCurso } from '../servicios/compra-en-curso';
import { ReservasTemporales } from '../servicios/reservas-temporales';
import { SeleccionButacas } from './seleccion-butacas';

const funcion: Funcion = {
  id: 'f1',
  pelicula_id: 'p1',
  sala_id: 's1',
  fecha: '2999-01-01',
  hora_inicio: '20:00:00',
  hora_fin: '22:00:00',
  formato: '2D',
  idioma: 'castellano',
  precio_base: 5000,
  precio_vip: 8000,
  en_preventa: false,
  precio_preventa: 4000,
};

const butacas: Butaca[] = [
  { id: 'b1', sala_id: 's1', fila: 1, columna: 1, tipo: 'normal' },
  { id: 'b2', sala_id: 's1', fila: 1, columna: 2, tipo: 'normal' },
  { id: 'b3', sala_id: 's1', fila: 2, columna: 1, tipo: 'vip' },
];

describe('SeleccionButacas', () => {
  let componente: SeleccionButacas;
  let fixture: ComponentFixture<SeleccionButacas>;
  let reservar: ReturnType<typeof vi.fn>;
  let navegar: ReturnType<typeof vi.fn>;
  let usuario: { id: string } | null;

  /** Interfaz mínima para llamar a los métodos protegidos desde el test. */
  type Interno = {
    cambiarCantidad(categoria: 'normal' | 'vip', delta: 1 | -1): void;
    alternarButaca(butaca: Butaca): void;
    siguiente(): Promise<void>;
    total(): number;
    seleccionadas(): readonly string[];
    puedeAvanzar(): boolean;
  };
  const interno = () => componente as unknown as Interno;

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(SeleccionButacas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    usuario = { id: 'u1' };
    reservar = vi.fn(async () => '2999-01-01T20:05:00Z');
    navegar = vi.fn(async () => true);

    await TestBed.configureTestingModule({
      imports: [SeleccionButacas],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ peliculaId: 'p1' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        { provide: Router, useValue: { navigate: navegar } },
        { provide: Autenticacion, useValue: { obtenerUsuario: async () => ({ data: { user: usuario } }) } },
        { provide: Funciones, useValue: { listarPorPelicula: async () => [funcion] } },
        { provide: Butacas, useValue: { listarPorSala: async () => butacas } },
        { provide: Salas, useValue: { listarSalas: async () => [{ id: 's1', nombre: 'Sala 1' }] } },
        { provide: Peliculas, useValue: { listarNombres: async () => [{ id: 'p1', nombre: 'Película de prueba' }] } },
        {
          provide: ReservasTemporales,
          useValue: {
            observar: () => ({
              reservas: signal([]),
              conectado: signal(true),
              recargar: async () => undefined,
              cerrar: () => undefined,
            }),
            reservar,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', async () => {
    await crear();
    expect(componente).toBeTruthy();
  });

  it('elige sola la única función y muestra el mapa', async () => {
    await crear();
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Película de prueba');
    expect(html.querySelector('app-mapa-butacas')).not.toBeNull();
    expect(html.querySelectorAll('.asiento').length).toBe(3);
  });

  it('acumula el precio según las entradas agregadas', async () => {
    await crear();
    await fixture.whenStable();

    interno().cambiarCantidad('normal', 1);
    interno().cambiarCantidad('normal', 1);
    interno().cambiarCantidad('vip', 1);

    expect(interno().total()).toBe(18000);
  });

  it('respeta el cupo de cada categoría', async () => {
    await crear();
    await fixture.whenStable();

    interno().cambiarCantidad('normal', 1);
    interno().alternarButaca(butacas[0]);
    interno().alternarButaca(butacas[1]); // ya no hay cupo normal
    interno().alternarButaca(butacas[2]); // no pidió VIP

    expect(interno().seleccionadas()).toEqual(['b1']);
  });

  it('al bajar la cantidad quita las butacas sobrantes', async () => {
    await crear();
    await fixture.whenStable();

    interno().cambiarCantidad('normal', 1);
    interno().cambiarCantidad('normal', 1);
    interno().alternarButaca(butacas[0]);
    interno().alternarButaca(butacas[1]);
    interno().cambiarCantidad('normal', -1);

    expect(interno().seleccionadas()).toEqual(['b1']);
  });

  it('reserva las butacas y sigue al checkout con la selección guardada', async () => {
    await crear();
    await fixture.whenStable();

    interno().cambiarCantidad('normal', 1);
    interno().alternarButaca(butacas[0]);
    expect(interno().puedeAvanzar()).toBe(true);

    await interno().siguiente();

    expect(reservar).toHaveBeenCalledWith('f1', ['b1']);
    expect(navegar).toHaveBeenCalledWith(['compra', 'p1', 'checkout'], {
      queryParams: { pelicula: 'p1', funcion: 'f1' },
    });
    const guardada = TestBed.inject(CompraEnCurso).seleccion();
    expect(guardada?.total).toBe(5000);
    expect(guardada?.cantidades).toEqual({ normal: 1, vip: 0 });
    expect(guardada?.reservaExpiraEn).toBe('2999-01-01T20:05:00Z');
  });

  it('sin sesión sigue la compra sin reservar', async () => {
    usuario = null;
    await crear();
    await fixture.whenStable();

    interno().cambiarCantidad('normal', 1);
    interno().alternarButaca(butacas[0]);
    await interno().siguiente();

    expect(reservar).not.toHaveBeenCalled();
    expect(navegar).toHaveBeenCalled();
    expect(TestBed.inject(CompraEnCurso).seleccion()?.reservaExpiraEn).toBeNull();
  });
});
