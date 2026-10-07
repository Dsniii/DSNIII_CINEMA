import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Autenticacion, type PerfilActual } from '../../../core/services/auth';
import { BarraNavegacion } from './navbar';

describe('BarraNavegacion', () => {
  let componente: BarraNavegacion;
  let fixture: ComponentFixture<BarraNavegacion>;
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(async () => {
    perfilActual = signal<PerfilActual | null>(null);

    await TestBed.configureTestingModule({
      imports: [BarraNavegacion],
      providers: [
        provideRouter([]),
        { provide: Autenticacion, useValue: { perfilActual, cerrarSesion: async () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarraNavegacion);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('muestra enlaces de cliente solo a clientes', () => {
    perfilActual.set({ nombre: 'Cliente', rol: 'cliente' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mi perfil');
    expect(fixture.nativeElement.textContent).toContain('Mis puntos');
    expect(fixture.nativeElement.textContent).not.toContain('Validar QR');
  });

  it('muestra validación QR a empleados', () => {
    perfilActual.set({ nombre: 'Empleado', rol: 'empleado' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Validar QR');
    expect(fixture.nativeElement.textContent).not.toContain('Dashboard');
  });

  it('muestra enlaces y destinos válidos a administradores', () => {
    perfilActual.set({ nombre: 'Admin', rol: 'admin' });
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    const destinations = links.map((link) => link.getAttribute('href'));

    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Validar QR');
    expect(destinations).toEqual(
      expect.arrayContaining([
        '/admin/dashboard',
        '/admin/reportes',
        '/admin/log-actividad',
        '/admin/salas',
        '/admin/funciones',
        '/admin/cupones',
        '/admin/candy',
      ]),
    );
  });

  it('al cerrar sesión redirige al login', async () => {
    const enrutador = TestBed.inject(Router);
    const navegar = vi.spyOn(enrutador, 'navigateByUrl').mockResolvedValue(true);

    await componente['cerrarSesion']();

    expect(navegar).toHaveBeenCalledWith('/auth/login');
  });
});
