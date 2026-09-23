import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngresoManual } from './ingreso-manual';

describe('IngresoManual', () => {
  let component: IngresoManual;
  let fixture: ComponentFixture<IngresoManual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresoManual],
    }).compileComponents();

    fixture = TestBed.createComponent(IngresoManual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
