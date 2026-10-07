import {
  ACCIONES_CONOCIDAS,
  accionesDeCategoria,
  describirAccion,
} from './clasificar-actividad';

describe('clasificar-actividad', () => {
  it('describe las acciones que registran funciones, precios y QR', () => {
    expect(describirAccion('crear_funcion')).toMatchObject({
      categoria: 'funciones',
      etiqueta: 'Función creada',
    });
    expect(describirAccion('modificar_precio_funcion').categoria).toBe('precios');
    expect(describirAccion('modificar_precio_producto').categoria).toBe('precios');
    expect(describirAccion('validar_entrada')).toMatchObject({ categoria: 'qr', tono: 'validacion' });
    expect(describirAccion('validar_entrada_rechazada').tono).toBe('rechazo');
  });

  it('muestra con nombre legible las acciones desconocidas', () => {
    expect(describirAccion('exportar_reporte_mensual')).toEqual({
      categoria: 'otros',
      etiqueta: 'Exportar reporte mensual',
      tono: 'neutro',
    });
    expect(describirAccion('').etiqueta).toBe('Acción sin nombre');
  });

  it('lista las acciones de cada categoría', () => {
    expect(accionesDeCategoria('funciones')).toEqual([
      'crear_funcion',
      'actualizar_funcion',
      'eliminar_funcion',
    ]);
    expect(accionesDeCategoria('precios')).toContain('modificar_precio_funcion');
    expect(accionesDeCategoria('qr')).toContain('entregar_canje');
    expect(accionesDeCategoria('otros')).toEqual([]);
  });

  it('cada acción conocida pertenece a una sola categoría', () => {
    const todas = (['funciones', 'precios', 'candy', 'qr'] as const).flatMap((categoria) =>
      accionesDeCategoria(categoria),
    );
    expect(todas.sort()).toEqual([...ACCIONES_CONOCIDAS].sort());
  });
});
