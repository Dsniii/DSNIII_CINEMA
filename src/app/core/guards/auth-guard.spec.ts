import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { authGuard } from './auth-guard';
import { Auth } from '../services/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  let auth: { getSession: () => Promise<{ data: { session: null }; error: null }> };

  beforeEach(() => {
    auth = {
      getSession: async () => ({ data: { session: null }, error: null }),
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

  it('should block unauthenticated users', async () => {
    const router = TestBed.inject(Router);
    const result = await executeGuard({} as any, {} as any);

    expect(result).toEqual(router.createUrlTree(['/auth/login']));
  });
});
