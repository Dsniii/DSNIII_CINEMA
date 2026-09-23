import { Injectable, signal } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface PerfilActual {
  nombre: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly supabase: SupabaseClient;
  readonly perfilActual = signal<PerfilActual | null>(null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    void this.cargarPerfil();

    this.supabase.auth.onAuthStateChange(() => {
      void this.cargarPerfil();
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

  private async cargarPerfil(): Promise<void> {
    const { data } = await this.supabase.auth.getUser();

    if (!data.user) {
      this.perfilActual.set(null);
      return;
    }

    const metadata = data.user.user_metadata;
    const rol = String(
      data.user.app_metadata['role'] ??
        data.user.app_metadata['rol'] ??
        metadata['role'] ??
        metadata['rol'] ??
        'cliente',
    ).toLowerCase();

    this.perfilActual.set({
      nombre: String(metadata['nombre'] ?? metadata['full_name'] ?? data.user.email ?? 'Usuario'),
      rol,
    });
  }
}
