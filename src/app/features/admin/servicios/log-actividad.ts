import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';

/** Datos para registrar un evento de auditoría en `log_actividad`. */
export interface RegistroActividad {
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle: string;
}

/** Servicio para registrar la actividad administrativa (crear/editar/borrar) en log_actividad. */
@Injectable({ providedIn: 'root' })
export class LogActividad {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /**
   * Inserta un registro de auditoría. `usuario_id` lo completa la base sola
   * (default `auth.uid()`). Si falla, solo se avisa por consola: nunca debe
   * tumbar la acción principal, que ya se guardó con éxito antes de llamar acá.
   */
  async registrar(evento: RegistroActividad): Promise<void> {
    const { error } = await this.supabase.from('log_actividad').insert({
      accion: evento.accion,
      entidad: evento.entidad,
      entidad_id: evento.entidadId ?? null,
      detalle: evento.detalle,
    });

    if (error) {
      console.error('No se pudo registrar la actividad:', error.message);
    }
  }
}