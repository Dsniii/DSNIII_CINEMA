import { Component } from '@angular/core';

@Component({
  selector: 'app-pagina-no-encontrada',
  standalone: true,
  template: `
    <section>
      <h2>Página no encontrada</h2>
      <p>La ruta solicitada no existe.</p>
    </section>
  `,
})
export class PaginaNoEncontrada {}
