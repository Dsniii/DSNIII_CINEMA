import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Registro } from './registro';

describe('Registro', () => {
  let componente: Registro;
  let fixture: ComponentFixture<Registro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registro],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Registro);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});