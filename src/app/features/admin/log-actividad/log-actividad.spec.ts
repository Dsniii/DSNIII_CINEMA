import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogActividad } from './log-actividad';

describe('LogActividad', () => {
  let component: LogActividad;
  let fixture: ComponentFixture<LogActividad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogActividad],
    }).compileComponents();

    fixture = TestBed.createComponent(LogActividad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
