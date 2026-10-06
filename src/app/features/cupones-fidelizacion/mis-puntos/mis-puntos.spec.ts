import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Perfil } from '../../../core/models/perfil';
import { Recompensa } from '../../../core/models/recompensa';
import { CatalogoRecompensas } from '../../../core/services/catalogo-recompensas';
import { Perfiles } from '../../../core/services/perfiles';
import { MisPuntos } from './mis-puntos';

const perfilEjemplo: Perfil = {
  nombre: 'Ana',
  apellido: 'Pérez',
  fecha_nacimiento: '1995-03-07',
  tipo_sangre: 'A+',
  color_ojos: 'Marrón',
  rol: 'cliente',
  creado_en: '2025-06-15T15:30:00+00:00',
  credito: 0,
  puntos_fidelizacion: 300,
};

const entradaGratis: Recompensa = {
  id: 'recompensa-1',
  nombre: 'Entrada gratis',
  tipo: 'entrada',
  producto_id: null,
  costo_puntos: 500,
  productos: null,
};

const pochoclo: Recompensa = {
  id: 'recompensa-2',
  nombre: 'Pochoclo grande',
  tipo: 'producto',
  producto_id: 'p1',
  costo_puntos: 150,
  productos: {
    nombre: 'Pochoclo grande',
    precio: 4500,
    imagen_path: null,
    activo: true,
    categorias_producto: { nombre: 'Pochoclos' },
  },
};

const bebidaInactiva: Recompensa = {
  id: 'recompensa-3',
  nombre: 'Gaseosa vieja',
  tipo: 'producto',
  producto_id: 'p2',
  costo_puntos: 100,
  productos: {
    nombre: 'Gaseosa vieja',
    precio: 2000,
    imagen_path: null,
    activo: false,
    categorias_producto: { nombre: 'Bebidas' },
  },
};

async function crearComponente(
  obtenerPerfilActual: () => Promise<Perfil>,
  listar: () => Promise<Recompensa[]>,
) {
  await TestBed.configureTestingModule({
    imports: [MisPuntos],
    providers: [
      { provide: Perfiles, useValue: { obtenerPerfilActual } },
      { provide: CatalogoRecompensas, useValue: { listar } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(MisPuntos);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('MisPuntos', () => {
  it('debería crearse', async () => {
    const fixture = await crearComponente(
      () => Promise.resolve(perfilEjemplo),
      () => Promise.resolve([]),
    );
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los puntos de fidelización del usuario', async () => {
    const fixture = await crearComponente(
      () => Promise.resolve(perfilEjemplo),
      () => Promise.resolve([]),
    );
    expect(fixture.nativeElement.querySelector('.balance-value').textContent).toContain('300');
  });

  it('lista las recompensas y oculta las de productos inactivos', async () => {
    const fixture = await crearComponente(
      () => Promise.resolve(perfilEjemplo),
      () => Promise.resolve([pochoclo, entradaGratis, bebidaInactiva]),
    );
    const texto: string = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelectorAll('.reward-card').length).toBe(2);
    expect(texto).toContain('Pochoclo grande');
    expect(texto).toContain('Entrada gratis');
    expect(texto).not.toContain('Gaseosa vieja');
  });

  it('indica cuáles se pueden canjear y cuántos puntos faltan', async () => {
    const fixture = await crearComponente(
      () => Promise.resolve(perfilEjemplo),
      () => Promise.resolve([pochoclo, entradaGratis]),
    );
    const estados: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.reward-status'),
    ).map((el) => (el as HTMLElement).textContent?.trim() ?? '');

    expect(estados).toEqual(['Ya podés canjearla', 'Te faltan 200 puntos']);
    expect(fixture.nativeElement.querySelector('.balance-available').textContent).toContain('1');
  });

  it('muestra un aviso cuando no hay recompensas', async () => {
    const fixture = await crearComponente(
      () => Promise.resolve(perfilEjemplo),
      () => Promise.resolve([]),
    );
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay recompensas');
  });

  it('muestra un error y permite reintentar si falla la carga', async () => {
    const listar = vi
      .fn<() => Promise<Recompensa[]>>()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce([pochoclo]);
    const fixture = await crearComponente(() => Promise.resolve(perfilEjemplo), listar);

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pochoclo grande');
  });
});
