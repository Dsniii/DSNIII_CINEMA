import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmacionEntrada } from './confirmacion-entrada';

describe('ConfirmacionEntrada', () => {
  let componente: ConfirmacionEntrada;
  let fixture: ComponentFixture<ConfirmacionEntrada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmacionEntrada],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmacionEntrada);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
