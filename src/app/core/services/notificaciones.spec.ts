import { TestBed } from '@angular/core/testing';
import { Notificaciones } from './notificaciones';

describe('Notificaciones', () => {
  let servicio: Notificaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Notificaciones);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
