import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { empleadoGuard } from './empleado-guard';
import { Autenticacion, type PerfilActual } from '../services/auth';

describe('empleadoGuard', () => {
  const executeGuard: CanActivateFn = (...parametrosGuard) =>
    TestBed.runInInjectionContext(() => empleadoGuard(...parametrosGuard));

  let autenticacion: {
    obtenerUsuario: () => Promise<{ data: { user: object | null }; error: null }>;
    sincronizarPerfil: () => Promise<void>;
  };
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(() => {
    perfilActual = signal<PerfilActual | null>({ nombre: 'Usuario', rol: 'cliente' });
    autenticacion = {
      obtenerUsuario: async () => ({ data: { user: {} }, error: null }),
      sincronizarPerfil: async () => undefined,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Autenticacion, useValue: { ...autenticacion, perfilActual } },
        provideRouter([]),
      ],
    });
  });

  it('debería crearse', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('debería denegar a usuarios que no son empleados', async () => {
    const enrutador = TestBed.inject(Router);
    const resultado = await executeGuard({} as any, {} as any);

    expect(resultado).toEqual(enrutador.createUrlTree(['/']));
  });

  it('debería permitir empleados y denegar admins', async () => {
    perfilActual.set({ nombre: 'Empleado', rol: 'empleado' });
    expect(await executeGuard({} as any, {} as any)).toBe(true);

    perfilActual.set({ nombre: 'Admin', rol: 'admin' });
    const enrutador = TestBed.inject(Router);
    expect(await executeGuard({} as any, {} as any)).toEqual(enrutador.createUrlTree(['/']));
  });
});
