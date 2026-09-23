import { TestBed } from '@angular/core/testing';
import { Resenas } from './resenas';

describe('Resenas', () => {
  let service: Resenas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Resenas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
