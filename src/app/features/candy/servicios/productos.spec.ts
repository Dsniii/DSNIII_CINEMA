import { TestBed } from '@angular/core/testing';
import { Productos } from './productos';

describe('Productos', () => {
  let servicio: Productos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Productos);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
