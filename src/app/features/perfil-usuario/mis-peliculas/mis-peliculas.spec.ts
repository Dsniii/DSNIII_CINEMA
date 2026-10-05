import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisPeliculas } from './mis-peliculas';

describe('MisPeliculas', () => {
  let componente: MisPeliculas;
  let fixture: ComponentFixture<MisPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPeliculas],
    }).compileComponents();

    fixture = TestBed.createComponent(MisPeliculas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
