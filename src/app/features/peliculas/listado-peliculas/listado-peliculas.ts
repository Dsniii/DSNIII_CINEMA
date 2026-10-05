import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

/** Pantalla con el listado de películas en cartelera. */
@Component({
  imports: [FormsModule],
  selector: 'app-listado-peliculas',
  styleUrl: './listado-peliculas.css',
  templateUrl: './listado-peliculas.html',
})
export class ListadoPeliculas {
  constructor(private enrutador: Router) {}

  
}
