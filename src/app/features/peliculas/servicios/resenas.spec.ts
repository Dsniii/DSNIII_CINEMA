import { TestBed } from '@angular/core/testing';
import { Resenas } from './resenas';

describe('Resenas', () => {
  let servicio: Resenas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Resenas);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
