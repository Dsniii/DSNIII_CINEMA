import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListadoProductos } from './listado-productos';

describe('ListadoProductos', () => {
  let component: ListadoProductos;
  let fixture: ComponentFixture<ListadoProductos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoProductos],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoProductos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
