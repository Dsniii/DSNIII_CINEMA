import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListadoProductos } from './listado-productos';

describe('ListadoProductos', () => {
  let componente: ListadoProductos;
  let fixture: ComponentFixture<ListadoProductos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoProductos],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoProductos);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });
});
