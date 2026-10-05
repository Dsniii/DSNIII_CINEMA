import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/** Providers adicionales para renderizado en servidor. */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

/** Configuración final del servidor: combina la base con la de SSR. */
export const config = mergeApplicationConfig(appConfig, serverConfig);
