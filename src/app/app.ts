import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraNavegacion } from './shared/componentes/navbar/navbar';

@Component({
  imports: [RouterOutlet, BarraNavegacion],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
/** Componente raíz de la aplicación. */
export class App {
  /** Título de la aplicación. */
  protected readonly title = signal('DSNIII_CINEMA');
}
