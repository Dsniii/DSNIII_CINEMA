import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GestionSalas } from './gestion-salas';
import { Salas as ServicioSalas } from '../servicios/salas';
import { Funciones } from '../servicios/funciones';
import { Peliculas } from '../../peliculas/servicios/peliculas';
import { Butacas } from '../servicios/butacas';
import { ReservasTemporales } from '../../compra/servicios/reservas-temporales';

const servicioSalasSimulado = {
  listarSalas: vi.fn(async () => [
    { id: 1, nombre: 'Sala 1' },
    { id: 2, nombre: 'Sala 2' },
    { id: 3, nombre: 'Sala 3' },
    { id: 4, nombre: 'Sala 4' },
  ]),
  crearSalaConButacas: vi.fn(async (nombre: string) => ({ id: 5, nombre })),
  actualizarNombreSala: vi.fn(async (id: number, nombre: string) => ({ id, nombre })),
  eliminarSalaConButacas: vi.fn(async () => undefined),
};

const servicioFuncionesSimulado = {
  listarPorSala: vi.fn(async (salaId: number | string) => [
    {
      id: `funcion-${salaId}`,
      pelicula_id: 'pelicula-1',
      sala_id: String(salaId),
      fecha: '2026-10-20',
      hora_inicio: '14:00:00',
      hora_fin: '16:15:00',
      formato: '2D' as const,
      idioma: 'castellano' as const,
      precio_base: 10,
      precio_vip: 15,
      en_preventa: false,
      precio_preventa: 0,
    },
  ]),
};

const servicioPeliculasSimulado = {
  listarNombres: vi.fn(async () => [{ id: 'pelicula-1', nombre: 'Película de prueba' }]),
};

const servicioButacasSimulado = {
  listarPorSala: vi.fn(async (salaId: string) => [
    { id: 'butaca-1', sala_id: salaId, fila: 1, columna: 1, tipo: 'normal' as const },
    { id: 'butaca-2', sala_id: salaId, fila: 1, columna: 2, tipo: 'normal' as const },
    { id: 'butaca-3', sala_id: salaId, fila: 1, columna: 3, tipo: 'normal' as const },
  ]),
};

const cerrarReservasSimulado = vi.fn();
const servicioReservasSimulado = {
  observar: vi.fn(() => ({
    reservas: signal([
      // Compra confirmada: sin vencimiento.
      {
        id: 'r1',
        funcion_id: 'funcion-1',
        butaca_id: 'butaca-1',
        usuario_id: 'u1',
        creado_en: '2026-10-07T10:00:00Z',
        expira_en: '9999-12-31T23:59:59+00:00',
      },
      // Reserva temporal vigente.
      {
        id: 'r2',
        funcion_id: 'funcion-1',
        butaca_id: 'butaca-2',
        usuario_id: 'u2',
        creado_en: '2026-10-07T10:00:00Z',
        expira_en: new Date(Date.now() + 60_000).toISOString(),
      },
      // Reserva temporal ya vencida: se ve libre.
      {
        id: 'r3',
        funcion_id: 'funcion-1',
        butaca_id: 'butaca-3',
        usuario_id: 'u3',
        creado_en: '2026-10-07T10:00:00Z',
        expira_en: new Date(Date.now() - 60_000).toISOString(),
      },
    ]),
    conectado: signal(true),
    recargar: vi.fn(async () => undefined),
    cerrar: cerrarReservasSimulado,
  })),
};

describe('GestionSalas', () => {
  let componente: GestionSalas;
  let fixture: ComponentFixture<GestionSalas>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [GestionSalas],
      providers: [
        { provide: ServicioSalas, useValue: servicioSalasSimulado },
        { provide: Funciones, useValue: servicioFuncionesSimulado },
        { provide: Peliculas, useValue: servicioPeliculasSimulado },
        { provide: Butacas, useValue: servicioButacasSimulado },
        { provide: ReservasTemporales, useValue: servicioReservasSimulado },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionSalas);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });

  it('muestra las 20 filas y calcula 532 butacas', () => {
    fixture.detectChanges();

    expect(componente.totalFilas()).toBe(20);
    expect(componente.totalButacas()).toBe(532);
    expect(componente.mapaButacas()).toHaveLength(20);
    expect(
      componente
        .mapaButacas()
        .slice(0, 3)
        .map((fila) => fila.letra),
    ).toEqual(['J', 'K', 'A']);
    expect(
      componente
        .mapaButacas()
        .slice(0, 2)
        .map((fila) => fila.numero),
    ).toEqual([10, 11]);
    expect(
      componente
        .mapaButacas()
        .find((fila) => fila.numero === 1)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([4, 20, 4]);
    expect(
      componente
        .mapaButacas()
        .find((fila) => fila.numero === 10)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([2, 10, 2]);
    expect(
      componente
        .mapaButacas()
        .find((fila) => fila.numero === 11)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([2, 10, 2]);
    expect(componente.mapaButacas()[19].letra).toBe('T');
    expect(fixture.nativeElement.querySelectorAll('.seat-row')).toHaveLength(20);
    expect(fixture.nativeElement.querySelectorAll('.seat')).toHaveLength(532);
  });

  it('renderiza el mapa solo cuando hay una sala seleccionada', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.seat-map')).not.toBeNull();

    componente.salas.set([]);
    componente.salaSeleccionadaId.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.seat-map')).toBeNull();
  });

  it('carga las salas del servicio y selecciona la primera', () => {
    expect(servicioSalasSimulado.listarSalas).toHaveBeenCalledOnce();
    expect(componente.salas().map((sala) => sala.nombre)).toEqual([
      'Sala 1',
      'Sala 2',
      'Sala 3',
      'Sala 4',
    ]);
    expect(componente.salaSeleccionada()?.id).toBe(1);
  });

  it('muestra las funciones de la sala seleccionada con el nombre de la película', async () => {
    await componente.cargarFuncionesSala(1);
    fixture.detectChanges();

    expect(servicioFuncionesSimulado.listarPorSala).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.textContent).toContain('Película de prueba');
    expect(fixture.nativeElement.textContent).toContain('20/10/2026');
    expect(fixture.nativeElement.textContent).toContain('14:00–16:15');
  });

  it('carga las funciones al cambiar de sala', async () => {
    componente.seleccionarSala({ id: 2, nombre: 'Sala 2' });
    await fixture.whenStable();

    expect(servicioFuncionesSimulado.listarPorSala).toHaveBeenCalledWith(2);
    expect(componente.funcionesSala()[0].sala_id).toBe('2');
  });

  it('sin función elegida todas las butacas se ven libres', () => {
    fixture.detectChanges();

    expect(componente.funcionSeleccionada()).toBeUndefined();
    expect(fixture.nativeElement.querySelectorAll('.seat.vendida')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.seat.reservada')).toHaveLength(0);
  });

  it('al elegir una función muestra las butacas vendidas y reservadas en vivo', async () => {
    await componente.cargarFuncionesSala(1);
    componente.seleccionarFuncion(componente.funcionesSala()[0]);
    fixture.detectChanges();

    expect(servicioReservasSimulado.observar).toHaveBeenCalledWith('funcion-1');
    expect(fixture.nativeElement.querySelectorAll('.seat.vendida')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.seat.reservada')).toHaveLength(1);
    expect(componente.resumenOcupacion()).toEqual({
      vendidas: 1,
      reservadas: 1,
      libres: componente.totalButacas() - 2,
    });
  });

  it('volver a tocar la función la deselecciona y cierra la conexión en vivo', async () => {
    await componente.cargarFuncionesSala(1);
    const funcion = componente.funcionesSala()[0];

    componente.seleccionarFuncion(funcion);
    componente.seleccionarFuncion(funcion);
    fixture.detectChanges();

    expect(cerrarReservasSimulado).toHaveBeenCalled();
    expect(componente.funcionSeleccionada()).toBeUndefined();
    expect(fixture.nativeElement.querySelectorAll('.seat.vendida')).toHaveLength(0);
  });

  it('permite agregar, renombrar y eliminar una sala', async () => {
    await componente.crearSala();
    expect(componente.salas()).toHaveLength(5);
    expect(servicioSalasSimulado.crearSalaConButacas).toHaveBeenCalledWith('Sala 5');

    componente.nombreSala.set('Sala Premium');
    await componente.guardarSala();
    expect(componente.salaSeleccionada()?.nombre).toBe('Sala Premium');
    expect(servicioSalasSimulado.actualizarNombreSala).toHaveBeenCalledWith(5, 'Sala Premium');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await componente.eliminarSala();
    expect(componente.salas()).toHaveLength(4);
    expect(servicioSalasSimulado.eliminarSalaConButacas).toHaveBeenCalledWith(5);
  });
});