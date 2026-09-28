import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Router, provideRouter } from '@angular/router';
import { Auth, type PerfilActual } from '../services/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const executeGuard: CanMatchFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  let auth: {
    getUser: () => Promise<{ data: { user: object | null }; error: null }>;
    sincronizarPerfil: () => Promise<void>;
    perfilActual: WritableSignal<PerfilActual | null>;
  };
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(() => {
    perfilActual = signal<PerfilActual | null>({ nombre: 'Usuario', rol: 'cliente' });
    auth = {
      getUser: async () => ({ data: { user: {} }, error: null }),
      sincronizarPerfil: async () => undefined,
      perfilActual,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: auth }, provideRouter([])],
    });
  });

  it('allows admins and denies other roles', async () => {
    const router = TestBed.inject(Router);

    expect(await executeGuard({} as any, {} as any, {} as any)).toEqual(router.createUrlTree(['/']));

    perfilActual.set({ nombre: 'Admin', rol: 'admin' });
    expect(await executeGuard({} as any, {} as any, {} as any)).toBe(true);
  });

  it('redirects unauthenticated users to login', async () => {
    auth.getUser = async () => ({ data: { user: null }, error: null });
    const router = TestBed.inject(Router);

    expect(await executeGuard({} as any, {} as any, {} as any)).toEqual(router.createUrlTree(['/auth/login']));
  });
});