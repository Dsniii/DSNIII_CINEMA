import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PiePagina } from './footer';

describe('PiePagina', () => {
  let componente: PiePagina;
  let fixture: ComponentFixture<PiePagina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiePagina],
    }).compileComponents();

    fixture = TestBed.createComponent(PiePagina);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
