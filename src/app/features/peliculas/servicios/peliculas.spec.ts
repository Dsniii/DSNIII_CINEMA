import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Peliculas } from './peliculas';

describe('Peliculas', () => {
  let servicio: Peliculas;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpc = vi.fn(async () => ({ error: null }));
    TestBed.configureTestingModule({
      providers: [{ provide: ClienteSupabase, useValue: { cliente: { rpc } } }],
    });
    servicio = TestBed.inject(Peliculas);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });

  it('reemplaza las etiquetas con los UUID seleccionados', async () => {
    await servicio.reemplazarGeneros('pelicula-uuid', ['genero-uuid-1', 'genero-uuid-2']);

    expect(rpc).toHaveBeenCalledWith('reemplazar_generos_pelicula', {
      p_pelicula_id: 'pelicula-uuid',
      p_genero_ids: ['genero-uuid-1', 'genero-uuid-2'],
    });
  });
});
