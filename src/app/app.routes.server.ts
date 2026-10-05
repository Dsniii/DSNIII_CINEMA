import { RenderMode, ServerRoute } from '@angular/ssr';

/** Rutas renderizadas en el servidor (SSR). */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
