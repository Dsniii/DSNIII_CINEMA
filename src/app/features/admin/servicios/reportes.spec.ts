import { TestBed } from '@angular/core/testing';
import { Reportes } from './reportes';

describe('Reportes', () => {
  let servicio: Reportes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Reportes);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
