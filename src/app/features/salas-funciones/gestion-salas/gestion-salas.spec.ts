import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionSalas } from './gestion-salas';

describe('GestionSalas', () => {
  let component: GestionSalas;
  let fixture: ComponentFixture<GestionSalas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionSalas],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionSalas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
