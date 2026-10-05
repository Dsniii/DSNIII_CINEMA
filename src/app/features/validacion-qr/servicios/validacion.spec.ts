import { TestBed } from '@angular/core/testing';
import { Validacion } from './validacion';

describe('Validacion', () => {
  let servicio: Validacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Validacion);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
