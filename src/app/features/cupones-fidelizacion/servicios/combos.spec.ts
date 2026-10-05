import { TestBed } from '@angular/core/testing';
import { Combos } from './combos';

describe('Combos', () => {
  let servicio: Combos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Combos);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
