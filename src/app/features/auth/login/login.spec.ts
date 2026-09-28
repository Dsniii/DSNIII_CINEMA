import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let profileSyncCount: number;

  beforeEach(async () => {
    profileSyncCount = 0;

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            signIn: async () => ({ error: null }),
            sincronizarPerfil: async () => {
              profileSyncCount++;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('synchronizes the profile after successful authentication', async () => {
    component.loginForm.setValue({ email: 'admin@example.com', password: 'password' });

    await component.onSubmit();

    expect(profileSyncCount).toBe(1);
  });
});



