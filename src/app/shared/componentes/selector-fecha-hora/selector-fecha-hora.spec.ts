import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectorFechaHora } from './selector-fecha-hora';

describe('SelectorFechaHora', () => {
  let componente: SelectorFechaHora;
  let fixture: ComponentFixture<SelectorFechaHora>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectorFechaHora],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorFechaHora);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
