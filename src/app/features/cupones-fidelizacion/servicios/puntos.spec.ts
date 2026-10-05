import { TestBed } from '@angular/core/testing';
import { Puntos } from './puntos';

describe('Puntos', () => {
  let servicio: Puntos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Puntos);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
