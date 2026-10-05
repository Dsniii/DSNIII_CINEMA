import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Funciones } from './funciones';

describe('Funciones', () => {
  let servicio: Funciones;
  let consultaFunciones: {
    select: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let datosFunciones: { id: string; fecha: string }[];
  let filtrarPorId: ReturnType<typeof vi.fn>;
  let filtrarPorSala: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    datosFunciones = [{ id: 'funcion-1', fecha: '2026-10-20' }];
    const ordenarPorHora = vi.fn(async () => ({ data: datosFunciones, error: null }));
    const ordenarPorFecha = vi.fn(() => ({ order: ordenarPorHora }));
    filtrarPorId = vi.fn(async () => ({ error: null }));
    filtrarPorSala = vi.fn(() => ({ order: ordenarPorFecha }));
    consultaFunciones = {
      select: vi.fn(() => ({ order: ordenarPorFecha, eq: filtrarPorSala })),
      delete: vi.fn(() => ({ eq: filtrarPorId })),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ClienteSupabase,
          useValue: { cliente: { from: vi.fn(() => consultaFunciones) } },
        },
      ],
    });
    servicio = TestBed.inject(Funciones);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('lista las funciones ordenadas por fecha y hora', async () => {
    await expect(servicio.listar()).resolves.toEqual(datosFunciones);
    expect(consultaFunciones.select).toHaveBeenCalledWith(
      'id, pelicula_id, sala_id, fecha, hora_inicio, hora_fin, formato, idioma, precio_base, precio_vip, en_preventa, precio_preventa',
    );
  });

  it('lista las funciones de una sala ordenadas por fecha y hora', async () => {
    await expect(servicio.listarPorSala('sala-uuid')).resolves.toEqual(datosFunciones);

    expect(filtrarPorSala).toHaveBeenCalledWith('sala_id', 'sala-uuid');
    expect(consultaFunciones.select).toHaveBeenCalledWith(
      'id, pelicula_id, sala_id, fecha, hora_inicio, hora_fin, formato, idioma, precio_base, precio_vip, en_preventa, precio_preventa',
    );
  });

  it('elimina una función por UUID', async () => {
    await servicio.eliminar('funcion-uuid');

    expect(consultaFunciones.delete).toHaveBeenCalledOnce();
    expect(filtrarPorId).toHaveBeenCalledWith('id', 'funcion-uuid');
  });
});
