import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly auth = inject(Auth);

  // Signal con el perfil logueado (null si es anónimo).
  // Se asume que Auth expone esto sincronizado con supabase.auth.onAuthStateChange()
  protected perfil = this.auth.perfilActual;

  protected rol = computed(() => {
    return this.perfil()?.rol?.trim().toLowerCase() ?? '';
  });

  protected estaLogueado = computed(() => this.perfil() !== null);
  protected esCliente = computed(() => this.rol() === 'cliente');
  protected esEmpleado = computed(() => this.rol() === 'empleado');
  protected esAdmin = computed(() => this.rol() === 'admin');

  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
  }
}