import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisPuntos } from './mis-puntos';

describe('MisPuntos', () => {
  let componente: MisPuntos;
  let fixture: ComponentFixture<MisPuntos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPuntos],
    }).compileComponents();

    fixture = TestBed.createComponent(MisPuntos);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
