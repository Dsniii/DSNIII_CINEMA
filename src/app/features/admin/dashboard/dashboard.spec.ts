import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tablero } from './dashboard';

describe('Tablero', () => {
  let componente: Tablero;
  let fixture: ComponentFixture<Tablero>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tablero],
    }).compileComponents();

    fixture = TestBed.createComponent(Tablero);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
