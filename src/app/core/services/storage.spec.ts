import { TestBed } from '@angular/core/testing';
import { Almacenamiento } from './storage';

describe('Almacenamiento', () => {
  let servicio: Almacenamiento;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Almacenamiento);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
