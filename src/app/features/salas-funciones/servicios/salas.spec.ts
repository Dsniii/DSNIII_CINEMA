import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { generarButacas, Salas } from './salas';

describe('Salas', () => {
  let servicio: Salas;
  let consultaSalas: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let insertarButacas: ReturnType<typeof vi.fn>;
  let errorInsercionButacas: { message: string } | null;
  let from: ReturnType<typeof vi.fn>;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorInsercionButacas = null;
    const salaCreada = { id: 42, nombre: 'Sala de prueba' };
    const consultaBorrado = { eq: vi.fn(async () => ({ error: null })) };
    const consultaInsertarSala = {
      select: vi.fn(() => ({ single: vi.fn(async () => ({ data: salaCreada, error: null })) })),
    };
    const filasSalas = [
      { id: 1, nombre: 'Sala 1' },
      { id: 2, nombre: 'Sala 2' },
    ];
    const consultaListarSalas = {
      order: vi.fn(async () => ({ data: filasSalas, error: null })),
    };
    const consultaActualizarSala = {
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 42, nombre: 'Sala renombrada' }, error: null })),
        })),
      })),
    };

    consultaSalas = {
      select: vi.fn(() => consultaListarSalas),
      insert: vi.fn(() => consultaInsertarSala),
      delete: vi.fn(() => consultaBorrado),
      update: vi.fn(() => consultaActualizarSala),
    };
    insertarButacas = vi.fn(async () => ({ error: errorInsercionButacas }));
    const consultaButacas = { insert: insertarButacas };
    from = vi.fn((tabla: string) => (tabla === 'salas' ? consultaSalas : consultaButacas));
    rpc = vi.fn(async () => ({ error: null }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ClienteSupabase,
          useValue: { cliente: { from, rpc } },
        },
      ],
    });
    servicio = TestBed.inject(Salas);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });

  it('lista las salas de la base ordenadas por id', async () => {
    const salas = await servicio.listarSalas();

    expect(consultaSalas.select).toHaveBeenCalledWith('id, nombre');
    expect(salas.map((sala) => sala.nombre)).toEqual(['Sala 1', 'Sala 2']);
  });

  it('actualiza el nombre de la sala en la base', async () => {
    const sala = await servicio.actualizarNombreSala(42, 'Sala renombrada');

    expect(consultaSalas.update).toHaveBeenCalledWith({ nombre: 'Sala renombrada' });
    expect(sala).toEqual({ id: 42, nombre: 'Sala renombrada' });
  });

  it('elimina la sala y sus butacas mediante la función transaccional', async () => {
    await servicio.eliminarSalaConButacas(42);

    expect(rpc).toHaveBeenCalledWith('eliminar_sala_con_butacas', { p_sala_id: '42' });
  });

  it('genera las 532 butacas con filas y columnas numeradas desde 1', () => {
    const butacas = generarButacas(42);

    expect(butacas).toHaveLength(532);
    expect(butacas[0]).toEqual({
      sala_id: 42,
      fila: 1,
      columna: 1,
      tipo: 'normal',
    });
    expect(butacas.filter((butaca) => butaca.fila === 10)).toHaveLength(14);
    expect(butacas.filter((butaca) => butaca.fila === 11)).toHaveLength(14);
    expect(butacas.filter((butaca) => butaca.fila === 20)).toHaveLength(28);
    expect(butacas.filter((butaca) => butaca.tipo === 'accesible')).toHaveLength(28);
    expect(butacas.filter((butaca) => butaca.tipo === 'vip')).toHaveLength(84);
  });

  it('crea la sala y luego inserta sus 532 butacas asociadas', async () => {
    const sala = await servicio.crearSalaConButacas('Sala de prueba');
    const butacas = insertarButacas.mock.calls[0][0];

    expect(sala).toEqual({ id: 42, nombre: 'Sala de prueba' });
    expect(from).toHaveBeenNthCalledWith(1, 'salas');
    expect(consultaSalas.insert).toHaveBeenCalledWith({ nombre: 'Sala de prueba' });
    expect(from).toHaveBeenNthCalledWith(2, 'butacas');
    expect(butacas).toHaveLength(532);
    expect(butacas.every((butaca: { sala_id: number }) => butaca.sala_id === 42)).toBe(true);
  });

  it('revierte la sala si falla la inserción de butacas', async () => {
    errorInsercionButacas = { message: 'Error de prueba' };

    await expect(servicio.crearSalaConButacas('Sala de prueba')).rejects.toThrow(
      'No se pudieron crear las butacas: Error de prueba.',
    );
    expect(consultaSalas.delete).toHaveBeenCalledOnce();
  });
});
