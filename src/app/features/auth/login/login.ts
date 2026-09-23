import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Completa el email y la contraseña correctamente.';
      return;
    }

    const email = this.loginForm.get('email')?.value?.trim() ?? '';
    const password = this.loginForm.get('password')?.value ?? '';

    try {
      const { error } = await this.auth.signIn(email, password);

      if (error) {
        console.error('Error al iniciar sesión:', error.message);
        this.errorMessage = error.message.toLowerCase().includes('email not confirmed')
          ? 'Confirma tu correo electrónico antes de iniciar sesión.'
          : 'Email o contraseña incorrectos.';
        return;
      }

      await this.router.navigate(['/']);
    } catch (error) {
      console.error('Error inesperado en login:', error);
      this.errorMessage = 'No se pudo iniciar sesión. Intenta de nuevo.';
    }
  }
}