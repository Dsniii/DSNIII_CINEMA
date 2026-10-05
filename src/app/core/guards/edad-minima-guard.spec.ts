import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { edadMinimaGuard } from './edad-minima-guard';
import { Autenticacion } from '../services/auth';

describe('edadMinimaGuard', () => {
  const executeGuard: CanActivateFn = (...parametrosGuard) =>
    TestBed.runInInjectionContext(() => edadMinimaGuard(...parametrosGuard));

  let autenticacion: { obtenerUsuario: () => Promise<{ data: { user: null }; error: null }> };

  beforeEach(() => {
    autenticacion = {
      obtenerUsuario: async () => ({ data: { user: null }, error: null }),
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

  it('debería bloquear el acceso si el usuario no inició sesión', async () => {
    const enrutador = TestBed.inject(Router);
    const resultado = await executeGuard({ paramMap: { get: () => '1' } } as any, {} as any);

    expect(resultado).toEqual(enrutador.createUrlTree(['/auth/login']));
  });
});
