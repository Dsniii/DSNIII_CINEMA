import { Injectable, inject } from '@angular/core';
import { Perfil } from '../models/perfil';
import { ClienteSupabase } from './supabase-client';

/** Acceso a la tabla `perfiles`. */
@Injectable({ providedIn: 'root' })
export class Perfiles {
  private readonly supabase = inject(ClienteSupabase);

  /** Devuelve el perfil del usuario con sesión iniciada. */
  async obtenerPerfilActual(): Promise<Perfil> {
    // AJUSTAR: nombre de la propiedad de ClienteSupabase que expone el cliente de Supabase.
    // Si la clase ya es el cliente (tiene `auth` y `from`), usá: const cliente = this.supabase;
    const cliente = this.supabase.cliente;

    const {
      data: { user },
      error: errorSesion,
    } = await cliente.auth.getUser();
    if (errorSesion || !user) {
      throw new Error('No hay una sesión activa.');
    }

    const { data, error } = await cliente
      .from('perfiles')
      .select('nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, rol, creado_en, credito, puntos_fidelizacion')
      .eq('id', user.id)
      .single();
    if (error) {
      throw error;
    }

    return data as Perfil;
  }
}