import { TestBed } from '@angular/core/testing';
import { AsignadorSala } from './asignador-sala';

describe('AsignadorSala', () => {
  let service: AsignadorSala;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsignadorSala);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
