import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { FuncionInput } from '../models/funcion';
import { AsignadorSala, calcularHoraFin } from './asignador-sala';

describe('AsignadorSala', () => {
  let servicio: AsignadorSala;
  let insertar: ReturnType<typeof vi.fn>;
  let respuestasInsercion: { data: unknown; error: { code?: string; message: string } | null }[];
  let consultarSalas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    respuestasInsercion = [];
    const salas = [
      { id: 'sala-1', nombre: 'Sala 1' },
      { id: 'sala-2', nombre: 'Sala 2' },
    ];
    const consultaSalas = {
      order: vi.fn(async () => ({ data: salas, error: null })),
    };
    consultarSalas = vi.fn(() => consultaSalas);
    insertar = vi.fn((datos: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          const respuesta = respuestasInsercion.shift();
          if (respuesta?.error) {
            return respuesta;
          }
          return {
            data: { id: 'funcion-1', ...datos },
            error: null,
          };
        }),
      })),
    }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ClienteSupabase,
          useValue: {
            cliente: {
              from: vi.fn((tabla: string) =>
                tabla === 'salas' ? { select: consultarSalas } : { insert: insertar },
              ),
            },
          },
        },
      ],
    });
    servicio = TestBed.inject(AsignadorSala);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('calcula el fin usando la duración de la película', () => {
    expect(calcularHoraFin('14:00', 118)).toBe('15:58');
  });

  it('prueba la siguiente sala solo ante el conflicto EXCLUDE 23P01', async () => {
    respuestasInsercion = [
      { data: null, error: { code: '23P01', message: 'no_superposicion_sala' } },
      { data: null, error: null },
    ];

    const funcion = await servicio.crear(datosFuncion, 118);

    expect(consultarSalas).toHaveBeenCalledOnce();
    expect(insertar).toHaveBeenCalledTimes(2);
    expect(insertar.mock.calls[0][0]).toMatchObject({
      sala_id: 'sala-1',
      hora_fin: '15:58',
    });
    expect(insertar.mock.calls[1][0]).toMatchObject({
      sala_id: 'sala-2',
      hora_fin: '15:58',
    });
    expect(funcion.sala_id).toBe('sala-2');
  });

  it('no prueba otras salas cuando el error no es de superposición', async () => {
    respuestasInsercion = [{ data: null, error: { code: '42501', message: 'RLS' } }];

    await expect(servicio.crear(datosFuncion, 118)).rejects.toThrow('RLS');
    expect(insertar).toHaveBeenCalledOnce();
  });

  it('no cambia de sala si se solicitó una sala específica ocupada', async () => {
    respuestasInsercion = [
      { data: null, error: { code: '23P01', message: 'no_superposicion_sala' } },
    ];

    await expect(servicio.crear(datosFuncion, 118, 'sala-1')).rejects.toThrow(
      'La sala elegida está ocupada',
    );
    expect(insertar).toHaveBeenCalledOnce();
    expect(insertar.mock.calls[0][0]).toMatchObject({ sala_id: 'sala-1' });
  });
});

const datosFuncion: FuncionInput = {
  pelicula_id: 'pelicula-uuid',
  fecha: '2026-10-20',
  hora_inicio: '14:00',
  formato: '2D',
  idioma: 'castellano',
  precio_base: 3500,
  precio_vip: 5000,
  en_preventa: false,
  precio_preventa: 2900,
};
