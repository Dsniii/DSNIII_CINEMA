import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient as SupabaseSdkClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/** Crea y comparte la conexión con Supabase para toda la aplicación. */
@Injectable({ providedIn: 'root' })
export class ClienteSupabase {
  /** Cliente del SDK de Supabase ya configurado. */
  readonly cliente: SupabaseSdkClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );
}
