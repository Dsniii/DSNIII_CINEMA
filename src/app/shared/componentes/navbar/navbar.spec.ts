import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth, type PerfilActual } from '../../../core/services/auth';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(async () => {
    perfilActual = signal<PerfilActual | null>(null);

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { perfilActual, logout: async () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows customer links only for customers', () => {
    perfilActual.set({ nombre: 'Cliente', rol: 'cliente' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mi perfil');
    expect(fixture.nativeElement.textContent).toContain('Mis puntos');
    expect(fixture.nativeElement.textContent).not.toContain('Validar QR');
  });

  it('shows QR validation for employees', () => {
    perfilActual.set({ nombre: 'Empleado', rol: 'empleado' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Validar QR');
    expect(fixture.nativeElement.textContent).not.toContain('Dashboard');
  });

  it('shows admin links and valid destinations for admins', () => {
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
});
