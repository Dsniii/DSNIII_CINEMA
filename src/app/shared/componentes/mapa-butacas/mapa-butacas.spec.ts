import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Butaca } from '../../../features/salas-funciones/models/butaca';
import { MapaButacas } from './mapa-butacas';

const butacas: Butaca[] = [
  { id: 'b1', sala_id: 's1', fila: 1, columna: 1, tipo: 'normal' },
  { id: 'b2', sala_id: 's1', fila: 1, columna: 2, tipo: 'normal' },
  { id: 'b3', sala_id: 's1', fila: 2, columna: 1, tipo: 'vip' },
];

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

  it('dibuja una butaca por cada una recibida', async () => {
    fixture.componentRef.setInput('butacas', butacas);
    await fixture.whenStable();

    const asientos = (fixture.nativeElement as HTMLElement).querySelectorAll('.asiento');
    expect(asientos.length).toBe(3);
  });

  it('marca ocupadas y seleccionadas, y no emite al tocar una ocupada', async () => {
    fixture.componentRef.setInput('butacas', butacas);
    fixture.componentRef.setInput('ocupadas', new Set(['b1']));
    fixture.componentRef.setInput('seleccionadas', ['b2']);
    await fixture.whenStable();

    const emitidas: Butaca[] = [];
    componente.alternar.subscribe((butaca) => emitidas.push(butaca));

    const asientos = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.asiento');
    expect(asientos[0].dataset['estado']).toBe('ocupada');
    expect(asientos[0].disabled).toBe(true);
    expect(asientos[1].dataset['estado']).toBe('seleccionada');

    asientos[0].click();
    asientos[1].click();
    expect(emitidas.map((b) => b.id)).toEqual(['b2']);
  });
});
