import { TestBed } from '@angular/core/testing';
import { Combos } from './combos';

describe('Combos', () => {
  let service: Combos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Combos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
