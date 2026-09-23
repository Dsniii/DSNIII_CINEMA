import { TestBed } from '@angular/core/testing';
import { Generos } from './generos';

describe('Generos', () => {
  let service: Generos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Generos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
