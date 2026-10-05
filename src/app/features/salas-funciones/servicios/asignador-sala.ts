import { Injectable } from '@angular/core';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { Funcion, FuncionInput } from '../models/funcion';

/** Columnas que se piden al leer o guardar una función. */
const CAMPOS_FUNCION =
  'id, pelicula_id, sala_id, fecha, hora_inicio, hora_fin, formato, idioma, precio_base, precio_vip, en_preventa, precio_preventa';

/** Error cuando ninguna sala candidata está libre en el horario pedido. */
export class SalaNoDisponibleError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'SalaNoDisponibleError';
  }
}

/** Suma la duración a la hora de inicio (HH:mm); debe terminar antes de medianoche. */
export function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaInicio);
  if (!coincidencia || !Number.isInteger(duracionMinutos) || duracionMinutos <= 0) {
    throw new Error('Ingresá un horario válido y una duración mayor a cero.');
  }

  const minutosInicio = Number(coincidencia[1]) * 60 + Number(coincidencia[2]);
  const minutosFin = minutosInicio + duracionMinutos;
  if (minutosFin >= 24 * 60) {
    throw new Error('La función debe terminar antes de la medianoche.');
  }

  const horas = Math.floor(minutosFin / 60);
  const minutos = minutosFin % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Crea o actualiza funciones asignándoles automáticamente una sala libre. */
@Injectable({ providedIn: 'root' })
export class AsignadorSala {
  constructor(private readonly clienteSupabase: ClienteSupabase) {}

  /** Crea una función en la sala preferida o en la primera sala libre. */
  crear(datos: FuncionInput, duracionMinutos: number, salaPreferidaId?: string): Promise<Funcion> {
    return this.guardarEnSalaDisponible(datos, duracionMinutos, undefined, salaPreferidaId);
  }

  /** Actualiza una función, reasignando sala si hace falta. */
  actualizar(
    id: string,
    datos: FuncionInput,
    duracionMinutos: number,
    salaPreferidaId?: string,
  ): Promise<Funcion> {
    return this.guardarEnSalaDisponible(datos, duracionMinutos, id, salaPreferidaId);
  }

  private async guardarEnSalaDisponible(
    datos: FuncionInput,
    duracionMinutos: number,
    id?: string,
    salaPreferidaId?: string,
  ): Promise<Funcion> {
    // Prueba las salas en orden por nombre; si hay conflicto de horario pasa a la siguiente.
    const horaFin = calcularHoraFin(datos.hora_inicio, duracionMinutos);
    const cliente = this.clienteSupabase.cliente;
    const { data: salas, error: errorSalas } = await cliente
      .from('salas')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (errorSalas) {
      throw new Error(`No se pudieron consultar las salas: ${errorSalas.message}`);
    }

    if (!salas?.length) {
      throw new Error('No hay salas creadas para asignar la función.');
    }

    const salasAProbar = salaPreferidaId
      ? salas.filter((sala) => sala.id === salaPreferidaId)
      : salas;

    if (salaPreferidaId && salasAProbar.length === 0) {
      throw new Error('La sala seleccionada ya no existe.');
    }

    for (const sala of salasAProbar) {
      const registro = { ...datos, sala_id: sala.id, hora_fin: horaFin };
      const resultado = id
        ? await cliente
            .from('funciones')
            .update(registro)
            .eq('id', id)
            .select(CAMPOS_FUNCION)
            .single()
        : await cliente.from('funciones').insert(registro).select(CAMPOS_FUNCION).single();

      if (!resultado.error) {
        return resultado.data as Funcion;
      }

      if (this.esConflictoDeHorario(resultado.error)) {
        continue;
      }

      throw new Error(`No se pudo guardar la función: ${resultado.error.message}`);
    }

    throw new SalaNoDisponibleError(
      salaPreferidaId
        ? 'La sala elegida está ocupada en ese horario; elegí otra sala, fecha u hora.'
        : 'No hay sala disponible para ese horario; probá otra fecha u hora.',
    );
  }

  /** Detecta el error de superposición de horarios en la base. */
  private esConflictoDeHorario(error: { code?: string; message?: string }): boolean {
    return error.code === '23P01' || error.message?.includes('no_superposicion_sala') === true;
  }
}
