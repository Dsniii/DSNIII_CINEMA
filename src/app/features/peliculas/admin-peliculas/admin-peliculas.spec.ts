import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminPeliculas } from './admin-peliculas';
import { Peliculas } from '../servicios/peliculas';

const generoBase = { id: 'genero-1', nombre: 'Acción' };

const peliculaBase = {
  id: 'pelicula-1',
  nombre: 'Película de prueba',
  sinopsis: 'Sinopsis',
  imagen_path: null,
  duracion_minutos: 100,
  restriccion_edad: 13,
  fecha_estreno: '2026-10-01',
  dias_preventa: 5,
  activa: true,
  generos: [generoBase],
};

const peliculasMock = {
  listar: vi.fn(async () => [peliculaBase]),
  listarGeneros: vi.fn(async () => [generoBase, { id: 'genero-2', nombre: 'Drama' }]),
  crear: vi.fn(async (datos: Omit<typeof peliculaBase, 'id' | 'generos'>) => ({
    ...datos,
    id: 'pelicula-2',
    generos: [],
  })),
  actualizar: vi.fn(
    async (id: number | string, datos: Omit<typeof peliculaBase, 'id' | 'generos'>) => ({
      ...datos,
      id,
      generos: [],
    }),
  ),
  actualizarEstado: vi.fn(async (id: number | string, activa: boolean) => ({
    ...peliculaBase,
    id,
    activa,
  })),
  reemplazarGeneros: vi.fn(async () => undefined),
};

describe('AdminPeliculas', () => {
  let componente: AdminPeliculas;
  let fixture: ComponentFixture<AdminPeliculas>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AdminPeliculas],
      providers: [{ provide: Peliculas, useValue: peliculasMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPeliculas);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('carga y filtra las películas activas', () => {
    expect(peliculasMock.listar).toHaveBeenCalledOnce();
    expect(componente.peliculas()).toHaveLength(1);
    expect(componente.peliculasFiltradas()[0].nombre).toBe('Película de prueba');
  });

  it('crea una película con los tipos de datos del formulario', async () => {
    Object.assign(componente.formulario, {
      nombre: 'Nueva película',
      sinopsis: 'Resumen',
      imagen_path: 'https://example.com/poster.jpg',
      duracion_minutos: 110,
      restriccion_edad: 16,
      fecha_estreno: '2026-11-10',
      dias_preventa: 7,
      activa: true,
      generoIds: ['genero-2'],
    });

    await componente.guardar();

    expect(peliculasMock.crear).toHaveBeenCalledWith({
      nombre: 'Nueva película',
      sinopsis: 'Resumen',
      imagen_path: 'https://example.com/poster.jpg',
      duracion_minutos: 110,
      restriccion_edad: 16,
      fecha_estreno: '2026-11-10',
      dias_preventa: 7,
      activa: true,
    });
    expect(peliculasMock.reemplazarGeneros).toHaveBeenCalledWith('pelicula-2', ['genero-2']);
    expect(componente.peliculas()).toHaveLength(2);
  });

  it('actualiza los datos de una película existente', async () => {
    componente.editar(peliculaBase);
    componente.formulario.nombre = 'Título actualizado';
    componente.formulario.generoIds = ['genero-2'];

    await componente.guardar();

    expect(peliculasMock.actualizar).toHaveBeenCalledWith('pelicula-1', {
      nombre: 'Título actualizado',
      sinopsis: 'Sinopsis',
      imagen_path: null,
      duracion_minutos: 100,
      restriccion_edad: 13,
      fecha_estreno: '2026-10-01',
      dias_preventa: 5,
      activa: true,
    });
    expect(peliculasMock.reemplazarGeneros).toHaveBeenCalledWith('pelicula-1', ['genero-2']);
    expect(componente.peliculas()[0].nombre).toBe('Título actualizado');
  });

  it('da de baja sin borrar la película', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await componente.cambiarEstado(componente.peliculas()[0]);

    expect(peliculasMock.actualizarEstado).toHaveBeenCalledWith('pelicula-1', false);
    expect(componente.peliculas()[0].activa).toBe(false);
  });
});
