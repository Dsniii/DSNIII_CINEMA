import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Autenticacion } from '../../../core/services/auth';

/** Barra de navegación con enlaces según el rol del usuario. */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class BarraNavegacion {
  private readonly autenticacion = inject(Autenticacion);
  private readonly enrutador = inject(Router);

  /** Perfil del usuario logueado (null si es anónimo). */
  protected perfil = this.autenticacion.perfilActual;

  protected rol = computed(() => {
    return this.perfil()?.rol?.trim().toLowerCase() ?? '';
  });

  protected estaLogueado = computed(() => this.perfil() !== null);
  protected esCliente = computed(() => this.rol() === 'cliente');
  protected esEmpleado = computed(() => this.rol() === 'empleado');
  protected esAdmin = computed(() => this.rol() === 'admin');

  /** Cierra la sesión del usuario actual y lo lleva al login. */
  async cerrarSesion(): Promise<void> {
    await this.autenticacion.cerrarSesion();
    await this.enrutador.navigateByUrl('/auth/login');
  }
}