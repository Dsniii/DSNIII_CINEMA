import { Injectable, inject } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { RegistroLog, UsuarioInterno } from '../models/evento-actividad';

/** Columnas que se leen de `log_actividad`. */
const CAMPOS_LOG = 'usuario_id, accion, entidad, entidad_id, detalle, fecha_hora';
/** Columnas que se leen de `perfiles` para mostrar quién hizo cada acción. */
const CAMPOS_USUARIO = 'id, nombre, apellido, rol';
/** Roles considerados usuarios internos. */
const ROLES_INTERNOS = ['admin', 'empleado'];

/** Filtros del historial; los campos vacíos no filtran. */
export interface FiltroActividad {
  /** Solo estas acciones (si está vacío o es nulo, no se limita). */
  acciones: readonly string[] | null;
  /** Todas menos estas acciones (para la categoría "otras"). */
  excluirAcciones: readonly string[] | null;
  usuarioId: string | null;
  /** Desde este instante (inclusive), ISO 8601. */
  desde: string | null;
  /** Hasta este instante (exclusive), ISO 8601. */
  hasta: string | null;
  /** Texto a buscar dentro del detalle. */
  texto: string;
}

/** Lectura del registro de actividad de los usuarios internos (solo admin, por RLS). */
@Injectable({ providedIn: 'root' })
export class HistorialActividad {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /** Lee una página del log, de lo más nuevo a lo más viejo. */
  async listar(filtro: FiltroActividad, primero: number, cantidad: number): Promise<RegistroLog[]> {
    let consulta = this.supabase
      .from('log_actividad')
      .select(CAMPOS_LOG)
      .order('fecha_hora', { ascending: false })
      .range(primero, primero + cantidad - 1);

    if (filtro.acciones && filtro.acciones.length > 0) {
      consulta = consulta.in('accion', [...filtro.acciones]);
    }
    if (filtro.excluirAcciones && filtro.excluirAcciones.length > 0) {
      consulta = consulta.not('accion', 'in', `(${filtro.excluirAcciones.join(',')})`);
    }
    if (filtro.usuarioId) {
      consulta = consulta.eq('usuario_id', filtro.usuarioId);
    }
    if (filtro.desde) {
      consulta = consulta.gte('fecha_hora', filtro.desde);
    }
    if (filtro.hasta) {
      consulta = consulta.lt('fecha_hora', filtro.hasta);
    }

    const texto = filtro.texto.trim();
    if (texto) {
      consulta = consulta.ilike('detalle', `%${escaparPatron(texto)}%`);
    }

    const { data, error } = await consulta;
    if (error) {
      throw new Error(`No se pudo cargar la actividad: ${error.message}`);
    }

    return (data ?? []) as RegistroLog[];
  }

  /** Lista los usuarios internos (admin y empleados) para el filtro y los nombres. */
  async listarUsuariosInternos(): Promise<UsuarioInterno[]> {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select(CAMPOS_USUARIO)
      .in('rol', ROLES_INTERNOS)
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
    }

    return (data ?? []) as UsuarioInterno[];
  }

  /** Busca usuarios por id (para acciones de quienes ya no son internos). */
  async buscarUsuarios(ids: readonly string[]): Promise<UsuarioInterno[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('perfiles')
      .select(CAMPOS_USUARIO)
      .in('id', [...ids]);

    if (error) {
      throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
    }

    return (data ?? []) as UsuarioInterno[];
  }
}

/** Escapa los comodines de `ilike` para que el texto se busque tal cual. */
function escaparPatron(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}
