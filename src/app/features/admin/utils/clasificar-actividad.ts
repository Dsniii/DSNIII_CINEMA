/** Agrupación de las acciones del log para filtrar y colorear. */
export type CategoriaActividad = 'funciones' | 'precios' | 'candy' | 'qr' | 'otros';
/** Valor del filtro de categoría: una categoría o todas. */
export type CategoriaFiltro = CategoriaActividad | 'todas';
/** Tono visual de la etiqueta de una acción. */
export type TonoActividad = 'alta' | 'cambio' | 'baja' | 'validacion' | 'rechazo' | 'neutro';

/** Cómo se presenta una acción del log. */
export interface InfoAccion {
  categoria: CategoriaActividad;
  etiqueta: string;
  tono: TonoActividad;
}

const ACCIONES: Readonly<Record<string, InfoAccion>> = {
  crear_funcion: { categoria: 'funciones', etiqueta: 'Función creada', tono: 'alta' },
  actualizar_funcion: { categoria: 'funciones', etiqueta: 'Función modificada', tono: 'cambio' },
  eliminar_funcion: { categoria: 'funciones', etiqueta: 'Función eliminada', tono: 'baja' },
  modificar_precio_funcion: {
    categoria: 'precios',
    etiqueta: 'Precio de función modificado',
    tono: 'cambio',
  },
  modificar_precio_producto: {
    categoria: 'precios',
    etiqueta: 'Precio de producto modificado',
    tono: 'cambio',
  },
  crear_producto: { categoria: 'candy', etiqueta: 'Producto creado', tono: 'alta' },
  actualizar_producto: { categoria: 'candy', etiqueta: 'Producto modificado', tono: 'cambio' },
  eliminar_producto: { categoria: 'candy', etiqueta: 'Producto eliminado', tono: 'baja' },
  validar_entrada: { categoria: 'qr', etiqueta: 'Entrada validada', tono: 'validacion' },
  validar_entrada_rechazada: { categoria: 'qr', etiqueta: 'Entrada rechazada', tono: 'rechazo' },
  validar_producto: { categoria: 'qr', etiqueta: 'Producto validado', tono: 'validacion' },
  validar_producto_rechazada: { categoria: 'qr', etiqueta: 'Producto rechazado', tono: 'rechazo' },
  entregar_canje: { categoria: 'qr', etiqueta: 'Canje entregado', tono: 'validacion' },
  entregar_canje_rechazada: { categoria: 'qr', etiqueta: 'Canje rechazado', tono: 'rechazo' },
  validar_qr_invalido: { categoria: 'qr', etiqueta: 'QR inválido', tono: 'rechazo' },
  validar_qr_no_encontrado: { categoria: 'qr', etiqueta: 'QR no encontrado', tono: 'rechazo' },
};

/** Todas las acciones que la pantalla sabe clasificar. */
export const ACCIONES_CONOCIDAS: readonly string[] = Object.keys(ACCIONES);

/** Opciones del filtro de categoría, en el orden en que se muestran. */
export const CATEGORIAS_FILTRO: ReadonlyArray<{ valor: CategoriaFiltro; etiqueta: string }> = [
  { valor: 'todas', etiqueta: 'Toda la actividad' },
  { valor: 'funciones', etiqueta: 'Funciones' },
  { valor: 'precios', etiqueta: 'Cambios de precio' },
  { valor: 'qr', etiqueta: 'Validaciones de QR' },
  { valor: 'candy', etiqueta: 'Candy bar' },
  { valor: 'otros', etiqueta: 'Otras acciones' },
];

/** Etiqueta y tono de una acción; las desconocidas se muestran con su nombre legible. */
export function describirAccion(accion: string): InfoAccion {
  const conocida = ACCIONES[accion];
  if (conocida) {
    return conocida;
  }

  const texto = accion.replace(/_/g, ' ').trim();
  return {
    categoria: 'otros',
    etiqueta: texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : 'Acción sin nombre',
    tono: 'neutro',
  };
}

/** Acciones que pertenecen a una categoría conocida (vacío para `otros`). */
export function accionesDeCategoria(categoria: CategoriaActividad): string[] {
  return ACCIONES_CONOCIDAS.filter((accion) => describirAccion(accion).categoria === categoria);
}
