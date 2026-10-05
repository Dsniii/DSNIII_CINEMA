import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** Servidor Express que sirve estáticos y renderiza la app Angular. */
const app = express();
const angularApp = new AngularNodeAppEngine();

/** Sirve los archivos estáticos desde /browser. */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/** Renderiza la aplicación Angular para el resto de las solicitudes. */
app.use((solicitud, respuestaHttp, siguiente) => {
  angularApp
    .handle(solicitud)
    .then((respuesta) =>
      respuesta ? writeResponseToNodeResponse(respuesta, respuestaHttp) : siguiente(),
    )
    .catch(siguiente);
});

/** Inicia el servidor si es el módulo principal o corre bajo PM2; usa PORT o 4000. */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** Manejador de solicitudes usado por Angular CLI (dev-server y build) o Cloud Functions. */
export const reqHandler = createNodeRequestHandler(app);
