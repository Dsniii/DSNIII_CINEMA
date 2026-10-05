import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanjeRecompensas } from './canje-recompensas';

describe('CanjeRecompensas', () => {
  let componente: CanjeRecompensas;
  let fixture: ComponentFixture<CanjeRecompensas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanjeRecompensas],
    }).compileComponents();

    fixture = TestBed.createComponent(CanjeRecompensas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
