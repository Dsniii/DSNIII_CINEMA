import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, provideRouter } from '@angular/router';
import { edadMinimaGuard } from './edad-minima-guard';
import { Autenticacion } from '../services/auth';
import { ClienteSupabase } from '../services/supabase-client';

describe('edadMinimaGuard', () => {
  const ejecutarGuard: CanActivateFn = (...parametrosGuard) =>
    TestBed.runInInjectionContext(() => edadMinimaGuard(...parametrosGuard));

  const ruta = {
    queryParamMap: { get: (clave: string) => (clave === 'pelicula' ? 'p1' : null) },
    paramMap: { get: () => 'f1' },
  } as unknown as ActivatedRouteSnapshot;

  let restriccion: number | null;
  let usuario: { id: string; user_metadata: Record<string, string> } | null;

  function anioHace(anios: number): string {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - anios);
    return fecha.toISOString().slice(0, 10);
  }

  beforeEach(() => {
    restriccion = 0;
    usuario = null;

    const cliente = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              restriccion === null
                ? { data: null, error: null }
                : { data: { restriccion_edad: restriccion, fecha_nacimiento: null }, error: null },
          }),
        }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Autenticacion, useValue: { obtenerUsuario: async () => ({ data: { user: usuario } }) } },
        { provide: ClienteSupabase, useValue: { cliente } },
        provideRouter([]),
      ],
    });
  });

  it('deja pasar a cualquiera si la película no tiene restricción', async () => {
    expect(await ejecutarGuard(ruta, {} as never)).toBe(true);
  });

  it('pide iniciar sesión si la película tiene restricción', async () => {
    restriccion = 18;
    const enrutador = TestBed.inject(Router);

    expect(await ejecutarGuard(ruta, {} as never)).toEqual(enrutador.createUrlTree(['/auth/login']));
  });

  it('deja pasar a un mayor de edad en una película +18', async () => {
    restriccion = 18;
    usuario = { id: 'u1', user_metadata: { fecha_nacimiento: anioHace(30) } };

    expect(await ejecutarGuard(ruta, {} as never)).toBe(true);
  });

  it('bloquea a un menor en una película +18 pero lo deja pasar en una +13 si ya cumplió 13', async () => {
    usuario = { id: 'u1', user_metadata: { fecha_nacimiento: anioHace(15) } };
    const enrutador = TestBed.inject(Router);

    restriccion = 18;
    expect(await ejecutarGuard(ruta, {} as never)).toEqual(enrutador.createUrlTree(['/']));

    restriccion = 13;
    expect(await ejecutarGuard(ruta, {} as never)).toBe(true);
  });

  it('redirige al inicio si no encuentra la película', async () => {
    restriccion = null;
    const enrutador = TestBed.inject(Router);

    expect(await ejecutarGuard(ruta, {} as never)).toEqual(enrutador.createUrlTree(['/']));
  });
});