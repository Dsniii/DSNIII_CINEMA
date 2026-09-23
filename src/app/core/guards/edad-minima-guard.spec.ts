import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { edadMinimaGuard } from './edad-minima-guard';
import { Auth } from '../services/auth';

describe('edadMinimaGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => edadMinimaGuard(...guardParameters));

  let auth: { getUser: () => Promise<{ data: { user: null }; error: null }> };

  beforeEach(() => {
    auth = {
      getUser: async () => ({ data: { user: null }, error: null }),
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

  it('should block access when the user is not logged in', async () => {
    const router = TestBed.inject(Router);
    const result = await executeGuard({ paramMap: { get: () => '1' } } as any, {} as any);

    expect(result).toEqual(router.createUrlTree(['/auth/login']));
  });
});
