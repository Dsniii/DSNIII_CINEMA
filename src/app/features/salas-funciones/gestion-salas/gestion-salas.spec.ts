import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GestionSalas } from './gestion-salas';
import { Salas as SalasService } from '../servicios/salas';

const salasServiceMock = {
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

describe('GestionSalas', () => {
  let component: GestionSalas;
  let fixture: ComponentFixture<GestionSalas>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [GestionSalas],
      providers: [{ provide: SalasService, useValue: salasServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionSalas);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las 20 filas y calcula 532 butacas', () => {
    fixture.detectChanges();

    expect(component.totalFilas()).toBe(20);
    expect(component.totalButacas()).toBe(532);
    expect(component.mapaButacas()).toHaveLength(20);
    expect(
      component
        .mapaButacas()
        .slice(0, 3)
        .map((fila) => fila.letra),
    ).toEqual(['J', 'K', 'A']);
    expect(
      component
        .mapaButacas()
        .slice(0, 2)
        .map((fila) => fila.numero),
    ).toEqual([10, 11]);
    expect(
      component
        .mapaButacas()
        .find((fila) => fila.numero === 1)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([4, 20, 4]);
    expect(
      component
        .mapaButacas()
        .find((fila) => fila.numero === 10)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([2, 10, 2]);
    expect(
      component
        .mapaButacas()
        .find((fila) => fila.numero === 11)
        ?.bloquesButacas.map((bloque) => bloque.length),
    ).toEqual([2, 10, 2]);
    expect(component.mapaButacas()[19].letra).toBe('T');
    expect(fixture.nativeElement.querySelectorAll('.seat-row')).toHaveLength(20);
    expect(fixture.nativeElement.querySelectorAll('.seat')).toHaveLength(532);
  });

  it('renderiza el mapa solo cuando hay una sala seleccionada', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.seat-map')).not.toBeNull();

    component.salas.set([]);
    component.salaSeleccionadaId.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.seat-map')).toBeNull();
  });

  it('carga las salas del servicio y selecciona la primera', () => {
    expect(salasServiceMock.listarSalas).toHaveBeenCalledOnce();
    expect(component.salas().map((sala) => sala.nombre)).toEqual([
      'Sala 1',
      'Sala 2',
      'Sala 3',
      'Sala 4',
    ]);
    expect(component.salaSeleccionada()?.id).toBe(1);
  });

  it('permite agregar, renombrar y eliminar una sala', async () => {
    await component.crearSala();
    expect(component.salas()).toHaveLength(5);
    expect(salasServiceMock.crearSalaConButacas).toHaveBeenCalledWith('Sala 5');

    component.nombreSala.set('Sala Premium');
    await component.guardarSala();
    expect(component.salaSeleccionada()?.nombre).toBe('Sala Premium');
    expect(salasServiceMock.actualizarNombreSala).toHaveBeenCalledWith(5, 'Sala Premium');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await component.eliminarSala();
    expect(component.salas()).toHaveLength(4);
    expect(salasServiceMock.eliminarSalaConButacas).toHaveBeenCalledWith(5);
  });
});
