import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalConfirmacion } from './modal-confirmacion';

describe('ModalConfirmacion', () => {
  let componente: ModalConfirmacion;
  let fixture: ComponentFixture<ModalConfirmacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalConfirmacion],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalConfirmacion);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
