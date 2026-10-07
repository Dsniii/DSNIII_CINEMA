/** Fila de la tabla `generos`. */
export interface Genero {
  id: string;
  nombre: string;
}

/** Fila de la tabla intermedia `peliculas_generos` (una película puede tener varios géneros). */
export interface PeliculaGenero {
  pelicula_id: string;
  genero_id: string;
}