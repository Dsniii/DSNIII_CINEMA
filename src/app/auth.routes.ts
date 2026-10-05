import { Routes } from '@angular/router';

/** Rutas de autenticación (login y registro). */
export const authRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.InicioSesion),
    title: 'Iniciar sesión',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
    title: 'Crear cuenta',
  },
];