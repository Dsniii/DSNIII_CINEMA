import { TestBed } from '@angular/core/testing';
import { ReservasTemporales } from './reservas-temporales';

describe('ReservasTemporales', () => {
  let servicio: ReservasTemporales;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ReservasTemporales);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
