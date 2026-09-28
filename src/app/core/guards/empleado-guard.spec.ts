import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { empleadoGuard } from './empleado-guard';
import { Auth, type PerfilActual } from '../services/auth';

describe('empleadoGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => empleadoGuard(...guardParameters));

  let auth: {
    getUser: () => Promise<{ data: { user: object | null }; error: null }>;
    sincronizarPerfil: () => Promise<void>;
  };
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(() => {
    perfilActual = signal<PerfilActual | null>({ nombre: 'Usuario', rol: 'cliente' });
    auth = {
      getUser: async () => ({ data: { user: {} }, error: null }),
      sincronizarPerfil: async () => undefined,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: { ...auth, perfilActual } },
        provideRouter([]),
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should deny non employee users', async () => {
    const router = TestBed.inject(Router);
    const result = await executeGuard({} as any, {} as any);

    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should allow employees and deny admins', async () => {
    perfilActual.set({ nombre: 'Empleado', rol: 'empleado' });
    expect(await executeGuard({} as any, {} as any)).toBe(true);

    perfilActual.set({ nombre: 'Admin', rol: 'admin' });
    const router = TestBed.inject(Router);
    expect(await executeGuard({} as any, {} as any)).toEqual(router.createUrlTree(['/']));
  });
});
