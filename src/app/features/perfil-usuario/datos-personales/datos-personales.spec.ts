import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Perfil } from '../../../core/models/perfil';
import { Perfiles } from '../../../core/services/perfiles';
import { DatosPersonales } from './datos-personales';

const perfilEjemplo: Perfil = {
  nombre: 'Ana',
  apellido: 'Pérez',
  fecha_nacimiento: '1995-03-07',
  tipo_sangre: 'A+',
  color_ojos: 'Marrón',
  rol: 'cliente',
  creado_en: '2025-06-15T15:30:00+00:00',
  credito: 1500,
  puntos_fidelizacion: 0,
};

async function crearComponente(obtenerPerfilActual: () => Promise<Perfil>) {
  await TestBed.configureTestingModule({
    imports: [DatosPersonales],
    providers: [{ provide: Perfiles, useValue: { obtenerPerfilActual } }],
  }).compileComponents();

  const fixture = TestBed.createComponent(DatosPersonales);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('DatosPersonales', () => {
  it('should create', async () => {
    const fixture = await crearComponente(() => Promise.resolve(perfilEjemplo));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra los datos del perfil', async () => {
    const fixture = await crearComponente(() => Promise.resolve(perfilEjemplo));
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Ana');
    expect(texto).toContain('Pérez');
    expect(texto).toContain('A+');
    expect(texto).toContain('Marrón');
    expect(texto).toContain('cliente');
  });

  it('muestra el crédito en pesos argentinos', async () => {
    const fixture = await crearComponente(() => Promise.resolve(perfilEjemplo));
    expect(fixture.nativeElement.querySelector('.data-credito').textContent).toContain('1.500,00');
  });

  it('muestra crédito cero cuando el perfil no tiene saldo', async () => {
    const fixture = await crearComponente(() => Promise.resolve({ ...perfilEjemplo, credito: 0 }));
    expect(fixture.nativeElement.querySelector('.data-credito').textContent).toContain('0,00');
  });

  it('muestra la fecha de nacimiento sin correrla por la zona horaria', async () => {
    const fixture = await crearComponente(() => Promise.resolve(perfilEjemplo));
    expect(fixture.nativeElement.textContent).toContain('07/03/1995');
  });

  it('muestra un error y permite reintentar si falla la carga', async () => {
    const obtener = vi
      .fn<() => Promise<Perfil>>()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce(perfilEjemplo);
    const fixture = await crearComponente(obtener);

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });
});