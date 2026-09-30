import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient as SupabaseSdkClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClient {
	readonly client: SupabaseSdkClient = createClient(
		environment.supabaseUrl,
		environment.supabaseAnonKey,
	);
}
