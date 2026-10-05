import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cargador } from './loader';

describe('Cargador', () => {
  let componente: Cargador;
  let fixture: ComponentFixture<Cargador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cargador],
    }).compileComponents();

    fixture = TestBed.createComponent(Cargador);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
