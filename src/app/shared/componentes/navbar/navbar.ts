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

  protected estaLogueado = computed(() => this.perfil() !== null);
  protected esCliente = computed(() => this.perfil()?.rol === 'cliente');
  protected esEmpleado = computed(
    () => this.perfil()?.rol === 'empleado' || this.perfil()?.rol === 'admin',
  );
  protected esAdmin = computed(() => this.perfil()?.rol === 'admin');

  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
  }
}