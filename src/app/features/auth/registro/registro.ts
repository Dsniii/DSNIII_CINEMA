import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Autenticacion } from '../../../core/services/auth';

/** Pantalla de registro de nuevos usuarios. */
@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private readonly constructorFormularios = inject(FormBuilder);
  private readonly enrutador = inject(Router);
  private readonly autenticacion = inject(Autenticacion);

  mensajeError = '';
  mensajeExito = '';

  /** Opciones del combobox de tipo de sangre. */
  readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  /** Opciones del combobox de color de ojos. */
  readonly coloresOjos = ['Marrón', 'Negro', 'Azul', 'Verde', 'Gris', 'Avellana', 'Ámbar'];

  formularioRegistro = this.constructorFormularios.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required]],
    tipo_sangre: ['', [Validators.required]],
    color_ojos: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Valida el formulario y registra al usuario; luego redirige al login. */
  async enviar(): Promise<void> {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.formularioRegistro.invalid) {
      this.formularioRegistro.markAllAsTouched();
      this.mensajeError = 'Completa todos los campos correctamente.';
      return;
    }

    const nombre = this.formularioRegistro.get('nombre')?.value?.trim() ?? '';
    const apellido = this.formularioRegistro.get('apellido')?.value?.trim() ?? '';
    const fecha_nacimiento = this.formularioRegistro.get('fecha_nacimiento')?.value ?? '';
    const tipo_sangre = this.formularioRegistro.get('tipo_sangre')?.value ?? '';
    const color_ojos = this.formularioRegistro.get('color_ojos')?.value ?? '';
    const correo = this.formularioRegistro.get('correo')?.value?.trim() ?? '';
    const contrasena = this.formularioRegistro.get('contrasena')?.value ?? '';

    try {
      const { data, error } = await this.autenticacion.registrarUsuario(correo, contrasena, {
        nombre,
        apellido,
        fecha_nacimiento,
        tipo_sangre,
        color_ojos,
      });

      if (error) {
        const errorNormalizado = error.message.toLowerCase();
        this.mensajeError = errorNormalizado.includes('already registered') || errorNormalizado.includes('user already exists')
          ? 'Ese email ya está registrado. Inicia sesión o usa otro email.'
          : errorNormalizado.includes('password')
            ? 'La contraseña no cumple los requisitos de Supabase.'
            : error.message;
        return;
      }

      if (data?.user) {
        this.mensajeExito = 'Usuario creado. Revisá tu correo para confirmar la cuenta.';
      } else {
        this.mensajeExito = 'Registro enviado. Revisá tu correo para continuar.';
      }

      this.formularioRegistro.reset();

      setTimeout(() => {
        void this.enrutador.navigate(['/auth/login']);
      }, 1200);
    } catch (error) {
      this.mensajeError = 'No se pudo completar el registro. Intentá de nuevo.';
      console.error('Error inesperado en registro:', error);
    }
  }
}