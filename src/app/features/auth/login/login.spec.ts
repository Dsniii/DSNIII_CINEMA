import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Autenticacion } from '../../../core/services/auth';
import { InicioSesion } from './login';

describe('InicioSesion', () => {
  let componente: InicioSesion;
  let fixture: ComponentFixture<InicioSesion>;
  let contadorSincronizaciones: number;

  beforeEach(async () => {
    contadorSincronizaciones = 0;

    await TestBed.configureTestingModule({
      imports: [InicioSesion],
      providers: [
        provideRouter([]),
        {
          provide: Autenticacion,
          useValue: {
            iniciarSesion: async () => ({ error: null }),
            sincronizarPerfil: async () => {
              contadorSincronizaciones++;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioSesion);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse', () => {
    expect(componente).toBeTruthy();
  });

  it('sincroniza el perfil tras autenticarse correctamente', async () => {
    componente.formularioLogin.setValue({ correo: 'admin@example.com', contrasena: 'password' });

    await componente.enviar();

    expect(contadorSincronizaciones).toBe(1);
  });
});



