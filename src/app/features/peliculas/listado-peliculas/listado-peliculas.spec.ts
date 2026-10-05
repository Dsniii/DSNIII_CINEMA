import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListadoPeliculas } from './listado-peliculas';

describe('ListadoPeliculas', () => {
  let componente: ListadoPeliculas;
  let fixture: ComponentFixture<ListadoPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoPeliculas],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoPeliculas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
