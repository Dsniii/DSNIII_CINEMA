import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Proximamente } from './proximamente';

describe('Proximamente', () => {
  let componente: Proximamente;
  let fixture: ComponentFixture<Proximamente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Proximamente],
    }).compileComponents();

    fixture = TestBed.createComponent(Proximamente);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
