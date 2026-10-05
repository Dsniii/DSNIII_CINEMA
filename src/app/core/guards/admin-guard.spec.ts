import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Router, provideRouter } from '@angular/router';
import { Autenticacion, type PerfilActual } from '../services/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const executeGuard: CanMatchFn = (...parametrosGuard) =>
    TestBed.runInInjectionContext(() => adminGuard(...parametrosGuard));

  let autenticacion: {
    obtenerUsuario: () => Promise<{ data: { user: object | null }; error: null }>;
    sincronizarPerfil: () => Promise<void>;
    perfilActual: WritableSignal<PerfilActual | null>;
  };
  let perfilActual: WritableSignal<PerfilActual | null>;

  beforeEach(() => {
    perfilActual = signal<PerfilActual | null>({ nombre: 'Usuario', rol: 'cliente' });
    autenticacion = {
      obtenerUsuario: async () => ({ data: { user: {} }, error: null }),
      sincronizarPerfil: async () => undefined,
      perfilActual,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Autenticacion, useValue: autenticacion }, provideRouter([])],
    });
  });

  it('permite admins y deniega otros roles', async () => {
    const enrutador = TestBed.inject(Router);

    expect(await executeGuard({} as any, {} as any, {} as any)).toEqual(enrutador.createUrlTree(['/']));

    perfilActual.set({ nombre: 'Admin', rol: 'admin' });
    expect(await executeGuard({} as any, {} as any, {} as any)).toBe(true);
  });

  it('redirige a login a usuarios sin sesión', async () => {
    autenticacion.obtenerUsuario = async () => ({ data: { user: null }, error: null });
    const enrutador = TestBed.inject(Router);

    expect(await executeGuard({} as any, {} as any, {} as any)).toEqual(enrutador.createUrlTree(['/auth/login']));
  });
});