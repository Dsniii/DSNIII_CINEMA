import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { personalGuard } from './core/guards/personal-guard';
import { empleadoGuard } from './core/guards/empleado-guard';
import { edadMinimaGuard } from './core/guards/edad-minima-guard';

/** Rutas principales de la aplicación, con carga diferida y guards por rol. */
export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth.routes').then((m) => m.authRoutes),
  },

  // ---------------------------------------------------------------
  // PÚBLICAS — cualquiera puede entrar, logueado o no
  // ---------------------------------------------------------------
  {
    path: '',
    loadComponent: () =>
      import('./features/peliculas/listado-peliculas/listado-peliculas').then(
        (m) => m.ListadoPeliculas,
      ),
    title: 'Cartelera',
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import('./features/peliculas/detalle-pelicula/detalle-pelicula').then(
        (m) => m.DetallePelicula,
      ),
    title: 'Detalle de película',
  },
  {
    path: 'proximamente',
    loadComponent: () =>
      import('./features/peliculas/proximamente/proximamente').then((m) => m.Proximamente),
    title: 'Próximamente',
  },
  {
    path: 'candy',
    loadComponent: () =>
      import('./features/candy/listado-productos/listado-productos').then(
        (m) => m.ListadoProductos,
      ),
    title: 'Candy bar',
  },

  // ---------------------------------------------------------------
  // COMPRA — no requiere login (se puede comprar anónimo), pero
  // valida restricción de edad si la película la tiene.
  // El guard debe resolver funcionId -> pelicula.restriccion_edad
  // contra Supabase y comparar con la fecha_nacimiento del usuario
  // logueado (si no hay usuario logueado y la peli es +13/+18, redirige a login).
  // ---------------------------------------------------------------
  {
    path: 'compra/:peliculaId/butacas',
    loadComponent: () =>
      import('./features/compra/seleccion-butacas/seleccion-butacas').then(
        (m) => m.SeleccionButacas,
      ),
    canActivate: [edadMinimaGuard],
    title: 'Elegir butacas',
  },
  {
    path: 'compra/:peliculaId/checkout',
    loadComponent: () => import('./features/compra/checkout/checkout').then((m) => m.Pago),
    title: 'Finalizar compra',
  },
  {
    path: 'compra/confirmacion/:compraId',
    loadComponent: () =>
      import('./features/compra/confirmacion-entrada/confirmacion-entrada').then(
        (m) => m.ConfirmacionEntrada,
      ),
    title: 'Tu entrada',
  },

  // ---------------------------------------------------------------
  // PERFIL — requiere estar logueado
  // ---------------------------------------------------------------
  {
    path: 'perfil',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'mis-peliculas', pathMatch: 'full' },
      {
        path: 'mis-peliculas',
        loadComponent: () =>
          import('./features/perfil-usuario/mis-peliculas/mis-peliculas').then(
            (m) => m.MisPeliculas,
          ),
      },
      {
        path: 'credito',
        loadComponent: () =>
          import('./features/perfil-usuario/mi-credito/mi-credito').then((m) => m.MiCredito),
      },
      {
        path: 'datos',
        loadComponent: () =>
          import('./features/perfil-usuario/datos-personales/datos-personales').then(
            (m) => m.DatosPersonales,
          ),
      },

      
    ],
  },

  // ---------------------------------------------------------------
  // FIDELIZACIÓN — requiere estar logueado (puntos son por usuario)
  // ---------------------------------------------------------------
  {
    path: 'fidelizacion',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'puntos', pathMatch: 'full' },
      {
        path: 'puntos',
        loadComponent: () =>
          import('./features/cupones-fidelizacion/mis-puntos/mis-puntos').then((m) => m.MisPuntos),
      },
      {
        path: 'canjear',
        loadComponent: () =>
          import('./features/cupones-fidelizacion/canje-recompensas/canje-recompensas').then(
            (m) => m.CanjeRecompensas,
          ),
      },
    ],
  },

  // ---------------------------------------------------------------
  // VALIDACIÓN QR — solo empleados y admin
  // ---------------------------------------------------------------
  {
    path: 'validacion-qr',
    canActivate: [empleadoGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/validacion-qr/escaner-qr/escaner-qr').then((m) => m.EscanerQr),
      },
      {
        path: 'manual',
        loadComponent: () =>
          import('./features/validacion-qr/ingreso-manual/ingreso-manual').then(
            (m) => m.IngresoManual,
          ),
      },
    ],
  },

  // ---------------------------------------------------------------
  // FUNCIONES Y CANDY ADMIN — admin y empleado (van antes de /admin, que es solo admin)
  // ---------------------------------------------------------------
  {
    path: 'admin/funciones',
    canMatch: [personalGuard],
    loadComponent: () =>
      import('./features/salas-funciones/gestion-funciones/gestion-funciones').then(
        (m) => m.GestionFunciones,
      ),
  },
  {
    path: 'admin/candy',
    canMatch: [personalGuard],
    loadComponent: () =>
      import('./features/candy/admin-productos/admin-productos').then((m) => m.AdminProductos),
  },

  // ---------------------------------------------------------------
  // ADMIN — solo admin. canMatch evita descargar el chunk siquiera
  // si el usuario no es admin (mejor que canActivate para este caso).
  // ---------------------------------------------------------------
  {
    path: 'admin',
    canMatch: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard').then((m) => m.Tablero),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'log-actividad',
        loadComponent: () =>
          import('./features/admin/log-actividad/log-actividad').then((m) => m.LogActividad),
      },
      {
        path: 'salas',
        loadComponent: () =>
          import('./features/salas-funciones/gestion-salas/gestion-salas').then(
            (m) => m.GestionSalas,
          ),
      },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./features/peliculas/admin-peliculas/admin-peliculas').then(
            (m) => m.AdminPeliculas,
          ),
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./features/salas-funciones/gestion-funciones/gestion-funciones').then(
            (m) => m.GestionFunciones,
          ),
      },
      {
        path: 'cupones',
        loadComponent: () =>
          import('./features/cupones-fidelizacion/admin-cupones/admin-cupones').then(
            (m) => m.AdminCupones,
          ),
      },
      {
        path: 'candy',
        loadComponent: () =>
          import('./features/candy/admin-productos/admin-productos').then((m) => m.AdminProductos),
      },
    ],
  },

  // ---------------------------------------------------------------
  // 404 — siempre al final
  // ---------------------------------------------------------------
  {
    path: '**',
    loadComponent: () =>
      import('./shared/componentes/pagina-no-encontrada/pagina-no-encontrada').then(
        (m) => m.PaginaNoEncontrada,
      ),
    title: 'Página no encontrada',
  },
];
