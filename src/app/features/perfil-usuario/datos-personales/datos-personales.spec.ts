import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatosPersonales } from './datos-personales';

describe('DatosPersonales', () => {
  let componente: DatosPersonales;
  let fixture: ComponentFixture<DatosPersonales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosPersonales],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosPersonales);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
