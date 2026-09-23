import { TestBed } from '@angular/core/testing';
import { Puntos } from './puntos';

describe('Puntos', () => {
  let service: Puntos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Puntos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
