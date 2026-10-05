import { TestBed } from '@angular/core/testing';
import { ClienteSupabase } from './supabase-client';

describe('ClienteSupabase', () => {
  let servicio: ClienteSupabase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ClienteSupabase);
  });

  it('debería crearse', () => {
    expect(servicio).toBeTruthy();
  });
});
