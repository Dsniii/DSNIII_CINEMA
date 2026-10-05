import { TestBed } from '@angular/core/testing';
import { Cupones } from './cupones';

describe('Cupones', () => {
  let servicio: Cupones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Cupones);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
