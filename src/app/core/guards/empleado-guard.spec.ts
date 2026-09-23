import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { empleadoGuard } from './empleado-guard';
import { Auth } from '../services/auth';

describe('empleadoGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => empleadoGuard(...guardParameters));

  let auth: { getUser: () => Promise<{ data: { user: { app_metadata: { role: string } } }; error: null }> };

  beforeEach(() => {
    auth = {
      getUser: async () => ({
        data: { user: { app_metadata: { role: 'cliente' } } },
        error: null,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: auth },
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
});
