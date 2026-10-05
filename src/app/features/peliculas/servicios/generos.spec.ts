import { TestBed } from '@angular/core/testing';
import { Generos } from './generos';

describe('Generos', () => {
  let servicio: Generos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Generos);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
