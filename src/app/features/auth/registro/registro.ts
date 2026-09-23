import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  errorMessage = '';
  successMessage = '';

  registerForm = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Completa todos los campos correctamente.';
      return;
    }

    const nombre = this.registerForm.get('nombre')?.value?.trim() ?? '';
    const apellido = this.registerForm.get('apellido')?.value?.trim() ?? '';
    const fecha_nacimiento = this.registerForm.get('fecha_nacimiento')?.value ?? '';
    const email = this.registerForm.get('email')?.value?.trim() ?? '';
    const password = this.registerForm.get('password')?.value ?? '';

    try {
      const { data, error } = await this.auth.signUp(email, password, {
        nombre,
        apellido,
        fecha_nacimiento,
      });

      if (error) {
        const normalizedError = error.message.toLowerCase();
        this.errorMessage = normalizedError.includes('already registered') || normalizedError.includes('user already exists')
          ? 'Ese email ya está registrado. Inicia sesión o usa otro email.'
          : normalizedError.includes('password')
            ? 'La contraseña no cumple los requisitos de Supabase.'
            : error.message;
        return;
      }

      if (data?.user) {
        this.successMessage = 'Usuario creado. Revisá tu correo para confirmar la cuenta.';
      } else {
        this.successMessage = 'Registro enviado. Revisá tu correo para continuar.';
      }

      this.registerForm.reset();

      setTimeout(() => {
        void this.router.navigate(['/auth/login']);
      }, 1200);
    } catch (error) {
      this.errorMessage = 'No se pudo completar el registro. Intentá de nuevo.';
      console.error('Error inesperado en registro:', error);
    }
  }
}