import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Salas as SalasService } from '../servicios/salas';

interface Sala {
  id: number | string;
  nombre: string;
  horarios: string[];
}

interface GrupoFilas {
  etiqueta: string;
  cantidadFilas: number;
  butacasIzquierda: number;
  butacasCentro: number;
  butacasDerecha: number;
  tipo: 'normal' | 'accesible' | 'vip';
  detalle: string;
}

interface FilaButacas {
  numero: number;
  letra: string;
  tipo: GrupoFilas['tipo'];
  bloquesButacas: number[][];
}

const DISTRIBUCION_FILAS: GrupoFilas[] = [
  {
    etiqueta: 'Filas A–I',
    cantidadFilas: 9,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'normal',
    detalle: '9 filas',
  },
  {
    etiqueta: 'Fila J',
    cantidadFilas: 1,
    butacasIzquierda: 2,
    butacasCentro: 10,
    butacasDerecha: 2,
    tipo: 'accesible',
    detalle: 'Accesible',
  },
  {
    etiqueta: 'Fila K',
    cantidadFilas: 1,
    butacasIzquierda: 2,
    butacasCentro: 10,
    butacasDerecha: 2,
    tipo: 'accesible',
    detalle: 'Accesible',
  },
  {
    etiqueta: 'Filas L–Q',
    cantidadFilas: 6,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'normal',
    detalle: '6 filas',
  },
  {
    etiqueta: 'Filas R–T',
    cantidadFilas: 3,
    butacasIzquierda: 4,
    butacasCentro: 20,
    butacasDerecha: 4,
    tipo: 'vip',
    detalle: 'VIP · 3',
  },
];

@Component({
  imports: [FormsModule],
  selector: 'app-gestion-salas',
  styleUrl: './gestion-salas.css',
  templateUrl: './gestion-salas.html',
})
export class GestionSalas implements OnInit {
  constructor(private readonly salasService: SalasService) {}

  readonly distribucion = DISTRIBUCION_FILAS;
  readonly salas = signal<Sala[]>([]);
  readonly salaSeleccionadaId = signal<number | string | null>(null);
  readonly nombreSala = signal('');
  readonly cargandoSalas = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly creandoSala = signal(false);
  readonly errorCreacion = signal<string | null>(null);
  readonly guardandoSala = signal(false);
  readonly errorEdicion = signal<string | null>(null);
  readonly eliminandoSala = signal(false);
  readonly errorEliminacion = signal<string | null>(null);
  readonly salaSeleccionada = computed(() =>
    this.salas().find((sala) => sala.id === this.salaSeleccionadaId()),
  );
  readonly totalFilas = computed(() =>
    this.distribucion.reduce((total, grupo) => total + grupo.cantidadFilas, 0),
  );
  readonly totalButacas = computed(() =>
    this.distribucion.reduce(
      (total, grupo) =>
        total +
        (grupo.butacasIzquierda + grupo.butacasCentro + grupo.butacasDerecha) * grupo.cantidadFilas,
      0,
    ),
  );
  readonly mapaButacas = computed<FilaButacas[]>(() => {
    const numerosFilas = Array.from({ length: this.totalFilas() }, (_, index) => index + 1);
    const ordenVisual = [
      ...numerosFilas.filter((numero) => numero === 10 || numero === 11),
      ...numerosFilas.filter((numero) => numero !== 10 && numero !== 11),
    ];

    return ordenVisual.map((numero) => {
      const accesible = numero === 10 || numero === 11;
      const vip = numero >= 18;
      let siguienteButaca = 1;
      const cantidadesBloques = accesible ? [2, 10, 2] : [4, 20, 4];

      return {
        numero,
        letra: String.fromCharCode(64 + numero),
        tipo: accesible ? 'accesible' : vip ? 'vip' : 'normal',
        bloquesButacas: cantidadesBloques.map((cantidad) =>
          Array.from({ length: cantidad }, () => siguienteButaca++),
        ),
      };
    });
  });
  readonly puedeGuardar = computed(() => {
    const sala = this.salaSeleccionada();
    const nombre = this.nombreSala().trim();

    return Boolean(
      sala &&
      nombre &&
      nombre !== sala.nombre &&
      !this.salas().some(
        (otraSala) =>
          otraSala.id !== sala.id &&
          otraSala.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase(),
      ),
    );
  });

  ngOnInit(): void {
    void this.cargarSalas();
  }

  async cargarSalas(): Promise<void> {
    this.cargandoSalas.set(true);
    this.errorCarga.set(null);

    try {
      const salas = (await this.salasService.listarSalas()).map((sala) => ({
        ...sala,
        horarios: [],
      }));

      this.salas.set(salas);

      if (salas.length > 0) {
        this.seleccionarSala(salas[0]);
      } else {
        this.salaSeleccionadaId.set(null);
        this.nombreSala.set('');
      }
    } catch (error) {
      this.errorCarga.set(
        error instanceof Error ? error.message : 'Ocurrió un error al cargar las salas.',
      );
    } finally {
      this.cargandoSalas.set(false);
    }
  }

  seleccionarSala(sala: Sala): void {
    this.salaSeleccionadaId.set(sala.id);
    this.nombreSala.set(sala.nombre);
  }

  async crearSala(): Promise<void> {
    if (this.creandoSala()) {
      return;
    }

    let numeroSala = 1;
    while (this.salas().some((sala) => sala.nombre === `Sala ${numeroSala}`)) {
      numeroSala += 1;
    }

    this.creandoSala.set(true);
    this.errorCreacion.set(null);

    try {
      const salaCreada = await this.salasService.crearSalaConButacas(`Sala ${numeroSala}`);
      const nuevaSala: Sala = { ...salaCreada, horarios: [] };

      this.salas.update((salas) => [...salas, nuevaSala]);
      this.seleccionarSala(nuevaSala);
    } catch (error) {
      this.errorCreacion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al crear la sala.',
      );
    } finally {
      this.creandoSala.set(false);
    }
  }

  async guardarSala(): Promise<void> {
    const sala = this.salaSeleccionada();
    const nombre = this.nombreSala().trim();

    if (!sala || !this.puedeGuardar() || this.guardandoSala() || this.eliminandoSala()) {
      return;
    }

    this.guardandoSala.set(true);
    this.errorEdicion.set(null);

    try {
      const salaActualizada = await this.salasService.actualizarNombreSala(sala.id, nombre);
      this.salas.update((salas) =>
        salas.map((item) => (item.id === sala.id ? { ...item, ...salaActualizada } : item)),
      );
      this.nombreSala.set(salaActualizada.nombre);
    } catch (error) {
      this.errorEdicion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al guardar la sala.',
      );
    } finally {
      this.guardandoSala.set(false);
    }
  }

  async eliminarSala(): Promise<void> {
    const sala = this.salaSeleccionada();

    if (
      !sala ||
      this.guardandoSala() ||
      this.eliminandoSala() ||
      !window.confirm(`¿Eliminar ${sala.nombre} y todas sus butacas?`)
    ) {
      return;
    }

    this.eliminandoSala.set(true);
    this.errorEliminacion.set(null);

    try {
      await this.salasService.eliminarSalaConButacas(sala.id);
      const salasRestantes = this.salas().filter((item) => item.id !== sala.id);
      this.salas.set(salasRestantes);

      if (salasRestantes.length > 0) {
        this.seleccionarSala(salasRestantes[0]);
      } else {
        this.salaSeleccionadaId.set(null);
        this.nombreSala.set('');
      }
    } catch (error) {
      this.errorEliminacion.set(
        error instanceof Error ? error.message : 'Ocurrió un error al eliminar la sala.',
      );
    } finally {
      this.eliminandoSala.set(false);
    }
  }

  filasDescripcion(grupo: GrupoFilas): string {
    return `${grupo.butacasIzquierda} · ${grupo.butacasCentro} · ${grupo.butacasDerecha}`;
  }
}
