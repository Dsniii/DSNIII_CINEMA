import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { authGuard } from './auth-guard';
import { Autenticacion } from '../services/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...parametrosGuard) =>
    TestBed.runInInjectionContext(() => authGuard(...parametrosGuard));

  let autenticacion: { obtenerSesion: () => Promise<{ data: { session: null }; error: null }> };

  beforeEach(() => {
    autenticacion = {
      obtenerSesion: async () => ({ data: { session: null }, error: null }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Autenticacion, useValue: autenticacion },
        provideRouter([]),
      ],
    });
  });

  it('debería crearse', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('debería bloquear usuarios sin sesión', async () => {
    const enrutador = TestBed.inject(Router);
    const resultado = await executeGuard({} as any, {} as any);

    expect(resultado).toEqual(enrutador.createUrlTree(['/auth/login']));
  });
});
