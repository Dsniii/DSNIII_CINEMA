import { Injectable, signal } from '@angular/core';
import { type SupabaseClient as SupabaseSdkClient, type User } from '@supabase/supabase-js';
import { ClienteSupabase } from './supabase-client';

/** Datos mínimos del perfil del usuario autenticado. */
export interface PerfilActual {
  nombre: string;
  rol: string;
}

/** Servicio de autenticación y perfil del usuario sobre Supabase. */
@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly supabase: SupabaseSdkClient;
  /** Perfil del usuario con sesión, o `null` si no hay sesión. */
  readonly perfilActual = signal<PerfilActual | null>(null);

  constructor(clienteSupabase: ClienteSupabase) {
    this.supabase = clienteSupabase.cliente;

    this.supabase.auth.onAuthStateChange((_evento, sesion) => {
      const usuario = sesion?.user ?? null;
      // Se difiere para no llamar a Supabase dentro del propio callback de auth.
      queueMicrotask(() => {
        void this.cargarPerfil(usuario);
      });
    });
  }

  /** Inicia sesión con correo y contraseña. */
  iniciarSesion(correo: string, contrasena: string) {
    return this.supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  }

  /** Registra un usuario nuevo guardando metadatos en su cuenta. */
  registrarUsuario(correo: string, contrasena: string, metadatos?: Record<string, unknown>) {
    return this.supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: metadatos ?? {},
      },
    });
  }

  /** Cierra la sesión en Supabase sin limpiar el perfil local. */
  finalizarSesion() {
    return this.supabase.auth.signOut();
  }

  /** Cierra la sesión y limpia el perfil local. */
  async cerrarSesion(): Promise<void> {
    await this.finalizarSesion();
    this.perfilActual.set(null);
  }

  /** Obtiene la sesión actual. */
  obtenerSesion() {
    return this.supabase.auth.getSession();
  }

  /** Obtiene el usuario actual validándolo contra el servidor. */
  obtenerUsuario() {
    return this.supabase.auth.getUser();
  }

  /** Recarga el perfil a partir del usuario actual. */
  async sincronizarPerfil(): Promise<void> {
    const { data } = await this.supabase.auth.getUser();
    await this.cargarPerfil(data.user);
  }

  /** Devuelve el rol del usuario (cliente, empleado o admin) o `null` si no es válido. */
  async obtenerRol(): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('rol_actual');

    if (error) {
      console.error('No se pudo cargar el rol del perfil:', error.message);
      return null;
    }

    const rol = String(data ?? '').trim().toLowerCase();
    return ['cliente', 'empleado', 'admin'].includes(rol) ? rol : null;
  }

  private async cargarPerfil(usuario: User | null): Promise<void> {
    if (!usuario) {
      this.perfilActual.set(null);
      return;
    }

    const rol = await this.obtenerRol();
    const metadatos = usuario.user_metadata;

    if (!rol) {
      console.error('El usuario autenticado no tiene un rol válido en perfiles.');
    }

    this.perfilActual.set({
      nombre: String(metadatos['nombre'] ?? metadatos['full_name'] ?? usuario.email ?? 'Usuario'),
      rol: rol ?? '',
    });
  }
}
