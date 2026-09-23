import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListadoPeliculas } from './listado-peliculas';

describe('ListadoPeliculas', () => {
  let component: ListadoPeliculas;
  let fixture: ComponentFixture<ListadoPeliculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoPeliculas],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoPeliculas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
