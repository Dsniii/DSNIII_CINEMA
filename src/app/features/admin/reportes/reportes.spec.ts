import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Reportes } from './reportes';

describe('Reportes', () => {
  let componente: Reportes;
  let fixture: ComponentFixture<Reportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportes],
    }).compileComponents();

    fixture = TestBed.createComponent(Reportes);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
