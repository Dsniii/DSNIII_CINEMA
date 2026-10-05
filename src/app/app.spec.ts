import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('debería crear la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    const aplicacion = fixture.componentInstance;
    expect(aplicacion).toBeTruthy();
  });

  it('debería mostrar el título', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compilado = fixture.nativeElement as HTMLElement;
    expect(compilado.querySelector('h1')?.textContent).toContain('Hello, DSNIII_CINEMA');
  });
});
