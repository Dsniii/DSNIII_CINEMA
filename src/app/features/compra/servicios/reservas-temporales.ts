import { Service, Signal, computed, inject, signal } from '@angular/core';
import type { PostgrestError, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ClienteSupabase } from '../../../core/services/supabase-client';
import { ReservaTemporal } from '../models/reserva-temporal';

/** Motivo por el que no se pudo reservar. */
export type CodigoErrorReserva = 'butaca_ocupada' | 'sin_sesion' | 'desconocido';

/** Error al reservar butacas, con un código para que la pantalla decida qué mostrar. */
export class ErrorReservaButacas extends Error {
  constructor(
    mensaje: string,
    readonly codigo: CodigoErrorReserva,
  ) {
    super(mensaje);
    this.name = 'ErrorReservaButacas';
  }
}

/** Reservas de una función que se mantienen actualizadas mientras el canal está abierto. */
export interface ReservasEnVivo {
  /** Reservas guardadas (pueden incluir alguna ya vencida: filtrar por `expira_en`). */
  readonly reservas: Signal<ReservaTemporal[]>;
  /** `true` mientras el canal de Realtime está suscripto. */
  readonly conectado: Signal<boolean>;
  /** Vuelve a leer las reservas desde la base. */
  recargar(): Promise<void>;
  /** Cierra el canal; hay que llamarlo al salir de la pantalla. */
  cerrar(): void;
}

/** Servicio para gestionar reservas temporales de butacas. */
@Service()
export class ReservasTemporales {
  private readonly supabase = inject(ClienteSupabase).cliente;

  /** Reservas de la función que todavía no vencieron. */
  async listarVigentes(funcionId: string): Promise<ReservaTemporal[]> {
    const { data, error } = await this.supabase
      .from('reservas_temporales')
      .select('id, funcion_id, butaca_id, usuario_id, creado_en, expira_en')
      .eq('funcion_id', funcionId)
      .gt('expira_en', new Date().toISOString());

    if (error) {
      throw new Error(`No se pudieron cargar las reservas: ${error.message}`);
    }

    return (data ?? []) as ReservaTemporal[];
  }

  /**
   * Escucha en vivo las reservas de una función (altas y bajas de otros usuarios).
   * La primera carga y cada reconexión leen el estado completo, así no se pierden eventos.
   */
  observar(funcionId: string): ReservasEnVivo {
    const porId = signal<ReadonlyMap<string, ReservaTemporal>>(new Map());
    const conectado = signal(false);

    const recargar = async (): Promise<void> => {
      try {
        const vigentes = await this.listarVigentes(funcionId);
        porId.set(new Map(vigentes.map((reserva) => [reserva.id, reserva])));
      } catch (error) {
        console.error(error);
      }
    };

    const canal = this.supabase
      .channel(`reservas-funcion-${funcionId}`)
      .on<ReservaTemporal>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas_temporales',
          filter: `funcion_id=eq.${funcionId}`,
        },
        (cambio: RealtimePostgresChangesPayload<ReservaTemporal>) => {
          const siguiente = new Map(porId());
          if (cambio.eventType === 'DELETE') {
            // Con RLS activo el evento de baja solo trae la clave primaria.
            const idBorrado = (cambio.old as Partial<ReservaTemporal>).id;
            if (idBorrado) {
              siguiente.delete(idBorrado);
            }
          } else {
            siguiente.set(cambio.new.id, cambio.new);
          }
          porId.set(siguiente);
        },
      )
      .subscribe((estado) => {
        conectado.set(estado === 'SUBSCRIBED');
        if (estado === 'SUBSCRIBED') {
          void recargar();
        }
      });

    void recargar();

    return {
      reservas: computed(() => [...porId().values()]),
      conectado: conectado.asReadonly(),
      recargar,
      cerrar: () => {
        void this.supabase.removeChannel(canal);
      },
    };
  }

  /**
   * Reserva las butacas para el usuario logueado durante 5 minutos (el tiempo lo fija la base).
   * Devuelve el instante de vencimiento (ISO).
   */
  async reservar(funcionId: string, butacaIds: string[]): Promise<string> {
    const { data, error } = await this.supabase.rpc('reservar_butacas', {
      p_funcion_id: funcionId,
      p_butacas: butacaIds,
    });

    if (error) {
      throw this.traducirError(error);
    }

    return String(data);
  }

  /** Libera las reservas del usuario en la función. */
  async liberar(funcionId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('usuario_id', usuarioId)
      // Las reservas de compras confirmadas (sin vencimiento) no se liberan.
      .lt('expira_en', '9999-01-01T00:00:00Z');

    if (error) {
      throw new Error(`No se pudieron liberar las butacas: ${error.message}`);
    }
  }

  private traducirError(error: PostgrestError): ErrorReservaButacas {
    if (error.code === '23505') {
      return new ErrorReservaButacas(
        'Alguna de las butacas ya fue reservada por otra persona.',
        'butaca_ocupada',
      );
    }
    if (error.code === '28000') {
      return new ErrorReservaButacas('Necesitás iniciar sesión para reservar.', 'sin_sesion');
    }
    return new ErrorReservaButacas(
      `No se pudieron reservar las butacas: ${error.message}`,
      'desconocido',
    );
  }
}