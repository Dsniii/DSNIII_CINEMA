import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  imports: [FormsModule],
  selector: 'app-listado-peliculas',
  styleUrl: './listado-peliculas.css',
  templateUrl: './listado-peliculas.html',
})
export class ListadoPeliculas {
  constructor(private router: Router) {}

  
}
