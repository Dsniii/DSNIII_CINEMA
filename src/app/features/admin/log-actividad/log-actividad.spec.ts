import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RegistroLog, UsuarioInterno } from '../models/evento-actividad';
import { HistorialActividad } from '../servicios/historial-actividad';
import { ACCIONES_CONOCIDAS } from '../utils/clasificar-actividad';
import { LogActividad, TAMANO_PAGINA } from './log-actividad';

const usuarios: UsuarioInterno[] = [
  { id: 'u1', nombre: 'Ana', apellido: 'Pérez', rol: 'admin' },
  { id: 'u2', nombre: 'Luis', apellido: 'Gómez', rol: 'empleado' },
];

function registro(parcial: Partial<RegistroLog>): RegistroLog {
  return {
    usuario_id: 'u1',
    accion: 'crear_funcion',
    entidad: 'funciones',
    entidad_id: 'f1',
    detalle: 'Creó la función "Película" el 2026-10-07 20:00',
    fecha_hora: '2026-10-07T23:30:15Z',
    ...parcial,
  };
}

describe('LogActividad', () => {
  let componente: LogActividad;
  let fixture: ComponentFixture<LogActividad>;
  let historial: {
    listar: ReturnType<typeof vi.fn>;
    listarUsuariosInternos: ReturnType<typeof vi.fn>;
    buscarUsuarios: ReturnType<typeof vi.fn>;
  };

  /** Métodos protegidos que usa la plantilla. */
  type Interno = {
    elegirCategoria(valor: string): void;
    elegirUsuario(valor: string): void;
    buscarTexto(valor: string): void;
    cargarMas(): Promise<void>;
    limpiarFiltros(): void;
  };
  const interno = () => componente as unknown as Interno;

  async function crear(registros: RegistroLog[]): Promise<void> {
    historial.listar.mockResolvedValue(registros);
    fixture = TestBed.createComponent(LogActividad);
    componente = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    historial = {
      listar: vi.fn(async () => []),
      listarUsuariosInternos: vi.fn(async () => usuarios),
      buscarUsuarios: vi.fn(async () => []),
    };

    await TestBed.configureTestingModule({
      imports: [LogActividad],
      providers: [{ provide: HistorialActividad, useValue: historial }],
    }).compileComponents();
  });

  it('should create', async () => {
    await crear([]);
    expect(componente).toBeTruthy();
  });

  it('muestra quién hizo cada acción, cuándo y el detalle', async () => {
    await crear([
      registro({}),
      registro({
        usuario_id: 'u2',
        accion: 'validar_entrada',
        entidad: 'entradas',
        detalle: 'Entrada validada: Película · Sala 1 · Butaca C5',
      }),
      registro({
        accion: 'modificar_precio_funcion',
        detalle: 'Modificó el precio: precio base $ 5.000 → $ 6.000',
      }),
    ]);

    const html = fixture.nativeElement as HTMLElement;
    const filas = html.querySelectorAll('tbody tr');
    expect(filas.length).toBe(3);

    expect(filas[0].textContent).toContain('Ana Pérez');
    expect(filas[0].textContent).toContain('Función creada');
    expect(filas[0].textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(filas[0].textContent).toMatch(/\d{2}:\d{2}:\d{2}/);

    expect(filas[1].textContent).toContain('Luis Gómez');
    expect(filas[1].textContent).toContain('Entrada validada');
    expect(filas[2].textContent).toContain('Precio de función modificado');
  });

  it('busca el nombre de quien ya no es usuario interno', async () => {
    historial.buscarUsuarios.mockResolvedValue([
      { id: 'u9', nombre: 'Marta', apellido: 'Ríos', rol: 'cliente' },
    ]);
    await crear([registro({ usuario_id: 'u9' }), registro({ usuario_id: null })]);

    expect(historial.buscarUsuarios).toHaveBeenCalledWith(['u9']);
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('Marta Ríos');
    expect(texto).toContain('Sistema');
  });

  it('filtra por categoría pidiendo solo sus acciones', async () => {
    await crear([]);
    historial.listar.mockClear();

    interno().elegirCategoria('qr');
    await fixture.whenStable();

    const [filtro, primero, cantidad] = historial.listar.mock.calls[0];
    expect(filtro.acciones).toContain('validar_entrada');
    expect(filtro.acciones).not.toContain('crear_funcion');
    expect(filtro.excluirAcciones).toBeNull();
    expect(primero).toBe(0);
    expect(cantidad).toBe(TAMANO_PAGINA);
  });

  it('en "otras acciones" excluye las conocidas', async () => {
    await crear([]);
    historial.listar.mockClear();

    interno().elegirCategoria('otros');
    await fixture.whenStable();

    const [filtro] = historial.listar.mock.calls[0];
    expect(filtro.acciones).toBeNull();
    expect(filtro.excluirAcciones).toEqual(ACCIONES_CONOCIDAS);
  });

  it('filtra por usuario y por texto del detalle', async () => {
    await crear([]);
    historial.listar.mockClear();

    interno().elegirUsuario('u2');
    interno().buscarTexto('Butaca C5');
    await fixture.whenStable();

    const filtro = historial.listar.mock.calls.at(-1)?.[0];
    expect(filtro.usuarioId).toBe('u2');
    expect(filtro.texto).toBe('Butaca C5');
  });

  it('pagina: ofrece cargar más cuando la página viene llena y la agrega al final', async () => {
    const pagina = Array.from({ length: TAMANO_PAGINA }, (_, i) =>
      registro({ entidad_id: `f${i}`, detalle: `Registro ${i}` }),
    );
    await crear(pagina);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('tbody tr').length).toBe(TAMANO_PAGINA);
    expect(html.textContent).toContain('Cargar más');

    historial.listar.mockResolvedValueOnce([registro({ detalle: 'Registro final' })]);
    await interno().cargarMas();
    fixture.detectChanges();

    expect(historial.listar.mock.calls.at(-1)?.[1]).toBe(TAMANO_PAGINA);
    expect(html.querySelectorAll('tbody tr').length).toBe(TAMANO_PAGINA + 1);
    expect(html.textContent).not.toContain('Cargar más');
  });

  it('informa el error si falla la carga', async () => {
    historial.listar.mockRejectedValue(new Error('No se pudo cargar la actividad: sin permisos'));
    fixture = TestBed.createComponent(LogActividad);
    componente = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('sin permisos');
  });
});
