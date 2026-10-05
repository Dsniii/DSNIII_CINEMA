import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetallePelicula } from './detalle-pelicula';

describe('DetallePelicula', () => {
  let componente: DetallePelicula;
  let fixture: ComponentFixture<DetallePelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePelicula);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
