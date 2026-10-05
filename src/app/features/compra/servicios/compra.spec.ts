import { TestBed } from '@angular/core/testing';
import { Compra } from './compra';

describe('Compra', () => {
  let servicio: Compra;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Compra);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
