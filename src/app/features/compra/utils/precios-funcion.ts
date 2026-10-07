import { TipoButaca } from '../../salas-funciones/models/butaca';
import { Funcion } from '../../salas-funciones/models/funcion';
import { CantidadesEntradas, CategoriaEntrada, PreciosEntrada } from '../models/seleccion-compra';

/** Precio unitario de cada categoría; en preventa el precio de preventa reemplaza a ambos. */
export function preciosDeFuncion(
  funcion: Pick<Funcion, 'precio_base' | 'precio_vip' | 'en_preventa' | 'precio_preventa'>,
): PreciosEntrada {
  if (funcion.en_preventa) {
    const preventa = Number(funcion.precio_preventa);
    return { normal: preventa, vip: preventa };
  }
  return { normal: Number(funcion.precio_base), vip: Number(funcion.precio_vip) };
}

/** Categoría que se cobra por un tipo de butaca (la accesible se cobra como normal). */
export function categoriaDeButaca(tipo: TipoButaca): CategoriaEntrada {
  return tipo === 'vip' ? 'vip' : 'normal';
}

/** Total a pagar, redondeado a centavos para evitar errores de coma flotante. */
export function calcularTotal(cantidades: CantidadesEntradas, precios: PreciosEntrada): number {
  const total = cantidades.normal * precios.normal + cantidades.vip * precios.vip;
  return Math.round(total * 100) / 100;
}
