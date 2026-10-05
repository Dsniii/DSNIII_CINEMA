import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaButacas } from './mapa-butacas';

describe('MapaButacas', () => {
  let componente: MapaButacas;
  let fixture: ComponentFixture<MapaButacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaButacas],
    }).compileComponents();

    fixture = TestBed.createComponent(MapaButacas);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(componente).toBeTruthy();
  });
});
