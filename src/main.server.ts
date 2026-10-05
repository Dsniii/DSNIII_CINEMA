import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

/** Arranque de la aplicación para renderizado en servidor. */
const bootstrap = (contexto: BootstrapContext) =>
    bootstrapApplication(App, config, contexto);

export default bootstrap;
