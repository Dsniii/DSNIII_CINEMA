import { TestBed } from '@angular/core/testing';
import { Autenticacion } from './auth';

describe('Autenticacion', () => {
  let servicio: Autenticacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Autenticacion);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
