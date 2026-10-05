import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Autenticacion } from '../../../core/services/auth';

/** Pantalla de inicio de sesión. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class InicioSesion {
  private readonly constructorFormularios = inject(FormBuilder);
  private readonly enrutador = inject(Router);
  private readonly autenticacion = inject(Autenticacion);

  mensajeError = '';

  formularioLogin = this.constructorFormularios.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  /** Valida el formulario, inicia sesión y redirige al inicio. */
  async enviar(): Promise<void> {
    this.mensajeError = '';

    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      this.mensajeError = 'Completa el email y la contraseña correctamente.';
      return;
    }

    const correo = this.formularioLogin.get('correo')?.value?.trim() ?? '';
    const contrasena = this.formularioLogin.get('contrasena')?.value ?? '';

    try {
      const { error } = await this.autenticacion.iniciarSesion(correo, contrasena);

      if (error) {
        console.error('Error al iniciar sesión:', error.message);
        this.mensajeError = error.message.toLowerCase().includes('email not confirmed')
          ? 'Confirma tu correo electrónico antes de iniciar sesión.'
          : 'Email o contraseña incorrectos.';
        return;
      }

      await this.autenticacion.sincronizarPerfil();
      await this.enrutador.navigate(['/']);
    } catch (error) {
      console.error('Error inesperado en login:', error);
      this.mensajeError = 'No se pudo iniciar sesión. Intenta de nuevo.';
    }
  }
}