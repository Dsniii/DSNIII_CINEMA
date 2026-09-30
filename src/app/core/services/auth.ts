import { Injectable, signal } from '@angular/core';
import { type SupabaseClient as SupabaseSdkClient, type User } from '@supabase/supabase-js';
import { SupabaseClient as SupabaseClientService } from './supabase-client';

export interface PerfilActual {
  nombre: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly supabase: SupabaseSdkClient;
  readonly perfilActual = signal<PerfilActual | null>(null);

  constructor(supabaseClient: SupabaseClientService) {
    this.supabase = supabaseClient.client;

    this.supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      queueMicrotask(() => {
        void this.cargarPerfil(user);
      });
    });
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string, metadata?: Record<string, unknown>) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata ?? {},
      },
    });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  async logout(): Promise<void> {
    await this.signOut();
    this.perfilActual.set(null);
  }

  getSession() {
    return this.supabase.auth.getSession();
  }

  getUser() {
    return this.supabase.auth.getUser();
  }

  async sincronizarPerfil(): Promise<void> {
    const { data } = await this.supabase.auth.getUser();
    await this.cargarPerfil(data.user);
  }

  async getRole(): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('rol_actual');

    if (error) {
      console.error('No se pudo cargar el rol del perfil:', error.message);
      return null;
    }

    const rol = String(data ?? '').trim().toLowerCase();
    return ['cliente', 'empleado', 'admin'].includes(rol) ? rol : null;
  }

  private async cargarPerfil(user: User | null): Promise<void> {
    if (!user) {
      this.perfilActual.set(null);
      return;
    }

    const rol = await this.getRole();
    const metadata = user.user_metadata;

    if (!rol) {
      console.error('El usuario autenticado no tiene un rol válido en perfiles.');
    }

    this.perfilActual.set({
      nombre: String(metadata['nombre'] ?? metadata['full_name'] ?? user.email ?? 'Usuario'),
      rol: rol ?? '',
    });
  }
}
