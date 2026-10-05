import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Resenas } from './resenas';

describe('Resenas', () => {
  let componente: Resenas;
  let fixture: ComponentFixture<Resenas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Resenas],
    }).compileComponents();

    fixture = TestBed.createComponent(Resenas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
