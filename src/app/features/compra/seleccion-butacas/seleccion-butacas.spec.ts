import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeleccionButacas } from './seleccion-butacas';

describe('SeleccionButacas', () => {
  let componente: SeleccionButacas;
  let fixture: ComponentFixture<SeleccionButacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionButacas],
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionButacas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
