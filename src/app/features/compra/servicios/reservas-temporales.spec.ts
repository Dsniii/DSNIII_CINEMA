import { TestBed } from '@angular/core/testing';
import { ReservasTemporales } from './reservas-temporales';

describe('ReservasTemporales', () => {
  let service: ReservasTemporales;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReservasTemporales);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
