import { TestBed } from '@angular/core/testing';
import { LogActividad } from './log-actividad';

describe('LogActividad', () => {
  let servicio: LogActividad;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(LogActividad);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
