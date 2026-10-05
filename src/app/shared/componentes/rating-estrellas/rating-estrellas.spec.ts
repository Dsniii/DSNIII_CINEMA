import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingEstrellas } from './rating-estrellas';

describe('RatingEstrellas', () => {
  let componente: RatingEstrellas;
  let fixture: ComponentFixture<RatingEstrellas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingEstrellas],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingEstrellas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
