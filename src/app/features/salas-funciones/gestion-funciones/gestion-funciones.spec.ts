import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import {
  estaEnVentanaPreventa,
  generarFechasRecurrentes,
  GestionFunciones,
} from './gestion-funciones';
import { AsignadorSala, SalaNoDisponibleError } from '../servicios/asignador-sala';
import { Funciones } from '../servicios/funciones';
import { Salas } from '../servicios/salas';

const peliculasSimulado = {
  listar: vi.fn(async () => [
    {
      id: 'pelicula-1',
      nombre: 'Película de prueba',
      sinopsis: null,
      imagen_path: null,
      duracion_minutos: 118,
      restriccion_edad: 13,
      fecha_estreno: '2026-10-20',
      dias_preventa: 7,
      activa: true,
      generos: [],
    },
  ]),
};

const salasSimulado = {
  listarSalas: vi.fn(async () => [
    { id: 'sala-1', nombre: 'Sala 1' },
    { id: 'sala-2', nombre: 'Sala 2' },
  ]),
};

const funcionesSimulado = {
  listar: vi.fn(async () => []),
  eliminar: vi.fn(async () => undefined),
};

const asignadorSimulado = {
  crear: vi.fn(async (datos: Record<string, unknown>, _duracion: number) => ({
    ...datos,
    id: 'funcion-1',
    sala_id: 'sala-2',
    hora_fin: '15:58',
  })),
  actualizar: vi.fn(async (id: string, datos: Record<string, unknown>, _duracion: number) => ({
    ...datos,
    id,
    sala_id: 'sala-2',
    hora_fin: '15:58',
  })),
};

describe('GestionFunciones', () => {
  let componente: GestionFunciones;
  let fixture: ComponentFixture<GestionFunciones>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [GestionFunciones],
      providers: [
        { provide: Funciones, useValue: funcionesSimulado },
        { provide: AsignadorSala, useValue: asignadorSimulado },
        { provide: Peliculas, useValue: peliculasSimulado },
        { provide: Salas, useValue: salasSimulado },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionFunciones);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });

  it('envía la función al asignador sin elegir sala y calcula preventa', async () => {
    componente.formulario.fecha = '2026-10-18';
    componente.formulario.hora_inicio = '14:00';

    await componente.guardar();

    const [datos, duracion] = asignadorSimulado.crear.mock.calls[0];
    expect(duracion).toBe(118);
    expect(datos).toMatchObject({
      pelicula_id: 'pelicula-1',
      fecha: '2026-10-18',
      hora_inicio: '14:00',
      formato: '2D',
      idioma: 'castellano',
    });
    expect(datos).not.toHaveProperty('sala_id');
    expect(componente.funciones()[0].sala_id).toBe('sala-2');
  });

  it('pasa la sala elegida al asignador', async () => {
    componente.formulario.fecha = '2026-10-20';
    componente.formulario.hora_inicio = '14:00';
    componente.formulario.sala_id = 'sala-1';

    await componente.guardar();

    expect(asignadorSimulado.crear).toHaveBeenCalledWith(
      expect.objectContaining({ pelicula_id: 'pelicula-1' }),
      118,
      'sala-1',
    );
  });

  it('calcula la apertura de preventa desde la fecha de estreno', () => {
    expect(componente.fechaInicioPreventa()).toBe('2026-10-13');
  });

  it('genera fechas recurrentes inclusivas para los días seleccionados', () => {
    expect(generarFechasRecurrentes('2026-10-05', '2026-10-16', [0, 4])).toEqual([
      '2026-10-05',
      '2026-10-09',
      '2026-10-12',
      '2026-10-16',
    ]);
  });

  it('rechaza una recurrencia sin días seleccionados', () => {
    expect(() => generarFechasRecurrentes('2026-10-05', '2026-10-16', [])).toThrow(
      'Seleccioná al menos un día de la semana',
    );
  });

  it('abre la preventa en la fecha configurada y la cierra al estrenar', () => {
    expect(estaEnVentanaPreventa('2026-10-12', '2026-10-20', 7)).toBe(false);
    expect(estaEnVentanaPreventa('2026-10-13', '2026-10-20', 7)).toBe(true);
    expect(estaEnVentanaPreventa('2026-10-19', '2026-10-20', 7)).toBe(true);
    expect(estaEnVentanaPreventa('2026-10-20', '2026-10-20', 7)).toBe(false);
    expect(estaEnVentanaPreventa('2026-10-13', '2026-10-20', 0)).toBe(false);
  });

  it('crea una función por cada día recurrente del rango', async () => {
    componente.tipoProgramacion.set('recurrente');
    componente.formulario.fecha = '2026-10-05';
    componente.fechaHasta.set('2026-10-12');
    componente.diasSeleccionados.set([0]);

    await componente.guardar();

    expect(asignadorSimulado.crear).toHaveBeenCalledTimes(2);
    expect(asignadorSimulado.crear.mock.calls.map(([datos]) => datos['fecha'])).toEqual([
      '2026-10-05',
      '2026-10-12',
    ]);
    expect(componente.funciones()).toHaveLength(2);
    expect(componente.mensaje()).toContain('Se crearon 2 de 2 funciones');
  });

  it('conserva los éxitos e informa las fechas recurrentes sin sala', async () => {
    asignadorSimulado.crear
      .mockImplementationOnce(async (datos, _duracion) => ({
        ...datos,
        id: 'funcion-1',
        sala_id: 'sala-2',
        hora_fin: '15:58',
      }))
      .mockRejectedValueOnce(new SalaNoDisponibleError('No hay sala disponible'));
    componente.tipoProgramacion.set('recurrente');
    componente.formulario.fecha = '2026-10-05';
    componente.fechaHasta.set('2026-10-12');
    componente.diasSeleccionados.set([0]);

    await componente.guardar();

    expect(componente.funciones()).toHaveLength(1);
    expect(componente.error()).toContain('2026-10-12');
    expect(componente.error()).toContain('Se crearon 1 de 2 funciones');
  });
});
