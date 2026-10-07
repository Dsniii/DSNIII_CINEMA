import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { CanjeComprado, ProductoComprado } from '../../features/compra/models/resultado-compra';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
const formatoPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const formatoNumero = new Intl.NumberFormat('es-AR');

const MARGEN = 40;
const ANCHO_PAGINA = 595;
const ALTO_UTIL = 800;

/** Titular de la compra. */
export interface TitularCompra {
  nombre: string;
  apellido: string;
}

/** Una entrada lista para imprimir. */
export interface EntradaPdf {
  butaca: string;
  categoria: string;
  precio: number;
  qr_code: string;
  /** Canjeada con la recompensa "Entrada gratis". */
  canjeada: boolean;
}

/** Datos del PDF de entradas. */
export interface DatosPdfEntradas {
  compraId: string;
  fechaCompra: string;
  titular: TitularCompra;
  pelicula: string;
  sala: string;
  /** Fecha de la función en formato `YYYY-MM-DD`. */
  fechaFuncion: string;
  horaInicio: string;
  horaFin: string;
  formato: string;
  idioma: string;
  entradas: EntradaPdf[];
}

/** Datos del PDF de productos y resumen de puntos/crédito. */
export interface DatosPdfProductos {
  compraId: string;
  fechaCompra: string;
  titular: TitularCompra;
  productos: ProductoComprado[];
  canjes: CanjeComprado[];
  subtotalEntradas: number;
  subtotalProductos: number;
  subtotal: number;
  descuentoCupon: number;
  cuponCodigo: string | null;
  creditoUtilizado: number;
  puntosUtilizados: number;
  puntosGanados: number;
  entradasCanjeadas: number;
  puntosEntradas: number;
  total: number;
  puntosRestantes: number;
  creditoRestante: number;
}

/** Convierte `YYYY-MM-DD` en una fecha local legible sin correrla por zona horaria. */
function fechaFuncionTexto(valor: string): string {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date(anio, mes - 1, dia));
}

function qr(codigo: string): Promise<string> {
  return QRCode.toDataURL(codigo, { margin: 1, width: 240 });
}

/** Salta de página si lo que sigue no entra. Devuelve la nueva posición vertical. */
function asegurarEspacio(doc: jsPDF, y: number, alto: number): number {
  if (y + alto > ALTO_UTIL) {
    doc.addPage();
    return MARGEN;
  }
  return y;
}

function encabezado(doc: jsPDF, titulo: string, compraId: string, fecha: string, titular: TitularCompra): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(titulo, MARGEN, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Titular: ${titular.nombre} ${titular.apellido}`.trim(), MARGEN, 72);
  doc.text(`Compra: ${compraId}`, MARGEN, 86);
  doc.text(`Fecha de compra: ${formatoFecha.format(new Date(fecha))}`, MARGEN, 100);

  doc.setDrawColor(180);
  doc.line(MARGEN, 112, ANCHO_PAGINA - MARGEN, 112);
  return 130;
}

/** Fila "etiqueta ........ valor" alineada a derecha. */
function fila(doc: jsPDF, y: number, etiqueta: string, valor: string, negrita = false): number {
  doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  doc.setFontSize(negrita ? 12 : 10);
  doc.text(etiqueta, MARGEN, y);
  doc.text(valor, ANCHO_PAGINA - MARGEN, y, { align: 'right' });
  return y + (negrita ? 20 : 16);
}

/**
 * PDF 1: resumen de las entradas (película, sala, función, butacas, precio) con un QR por entrada.
 * Todo se genera en el navegador y se descarga.
 */
export async function descargarPdfEntradas(datos: DatosPdfEntradas): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = encabezado(doc, 'Tus entradas', datos.compraId, datos.fechaCompra, datos.titular);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(datos.pelicula || 'Pelicula', MARGEN, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lineas = [
    `Sala: ${datos.sala || '-'}`,
    `Fecha: ${fechaFuncionTexto(datos.fechaFuncion)}`,
    `Horario: ${datos.horaInicio.slice(0, 5)} a ${datos.horaFin.slice(0, 5)}`,
    `Formato: ${datos.formato} - ${datos.idioma === 'subtitulada' ? 'Subtitulada' : 'Castellano'}`,
  ];
  for (const linea of lineas) {
    doc.text(linea, MARGEN, y);
    y += 15;
  }
  y += 10;

  let total = 0;
  for (const entrada of datos.entradas) {
    y = asegurarEspacio(doc, y, 140);
    total += entrada.precio;

    doc.setDrawColor(200);
    doc.rect(MARGEN, y, ANCHO_PAGINA - MARGEN * 2, 126);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(`Butaca ${entrada.butaca}`, MARGEN + 14, y + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Categoria: ${entrada.categoria}`, MARGEN + 14, y + 56);
    doc.text(
      entrada.canjeada ? 'Entrada gratis (canjeada con puntos)' : `Precio: ${formatoPesos.format(entrada.precio)}`,
      MARGEN + 14,
      y + 72,
    );
    doc.setFontSize(7);
    doc.text(`Codigo: ${entrada.qr_code}`, MARGEN + 14, y + 112, { maxWidth: 330 });

    doc.addImage(await qr(entrada.qr_code), 'PNG', ANCHO_PAGINA - MARGEN - 116, y + 8, 110, 110);
    y += 140;
  }

  y = asegurarEspacio(doc, y, 60);
  doc.setDrawColor(180);
  doc.line(MARGEN, y, ANCHO_PAGINA - MARGEN, y);
  y += 20;
  fila(doc, y, 'Total de entradas', formatoPesos.format(total), true);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Presenta el QR de cada entrada en la sala. Cada codigo se valida una sola vez.', MARGEN, 820);

  doc.save(`entradas-${datos.compraId}.pdf`);
}

/**
 * PDF 2: resumen de la compra de productos, canjes por puntos y uso de puntos/crédito,
 * con un QR por producto o canje para retirarlo en el candy bar.
 */
export async function descargarPdfProductos(datos: DatosPdfProductos): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = encabezado(doc, 'Resumen de tu compra', datos.compraId, datos.fechaCompra, datos.titular);

  // --- Resumen de importes, puntos y crédito ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumen', MARGEN, y);
  y += 20;

  if (datos.subtotalEntradas > 0) {
    y = fila(doc, y, 'Entradas', formatoPesos.format(datos.subtotalEntradas));
  }
  y = fila(doc, y, 'Productos', formatoPesos.format(datos.subtotalProductos));
  y = fila(doc, y, 'Subtotal', formatoPesos.format(datos.subtotal));
  if (datos.descuentoCupon > 0) {
    const cupon = datos.cuponCodigo ? ` (${datos.cuponCodigo})` : '';
    y = fila(doc, y, `Cupon${cupon}`, `- ${formatoPesos.format(datos.descuentoCupon)}`);
  }
  if (datos.creditoUtilizado > 0) {
    y = fila(doc, y, 'Credito utilizado', `- ${formatoPesos.format(datos.creditoUtilizado)}`);
  }
  y += 4;
  y = fila(doc, y, 'Total pagado', formatoPesos.format(datos.total), true);
  y += 8;

  if (datos.entradasCanjeadas > 0) {
    y = fila(
      doc,
      y,
      `Entradas gratis canjeadas (${datos.entradasCanjeadas})`,
      `${formatoNumero.format(datos.puntosEntradas)} pts`,
    );
  }
  y = fila(doc, y, 'Puntos de fidelizacion utilizados', `${formatoNumero.format(datos.puntosUtilizados)} pts`);
  y = fila(doc, y, 'Puntos ganados con esta compra', `+ ${formatoNumero.format(datos.puntosGanados)} pts`);
  y = fila(doc, y, 'Saldo de puntos', `${formatoNumero.format(datos.puntosRestantes)} pts`);
  y = fila(doc, y, 'Credito restante', formatoPesos.format(datos.creditoRestante));
  y += 10;

  // --- Productos pagados con dinero ---
  if (datos.productos.length > 0) {
    y = asegurarEspacio(doc, y, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Productos', MARGEN, y);
    y += 14;

    for (const p of datos.productos) {
      y = asegurarEspacio(doc, y, 100);
      doc.setDrawColor(200);
      doc.rect(MARGEN, y, ANCHO_PAGINA - MARGEN * 2, 88);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(p.nombre, MARGEN + 12, y + 24, { maxWidth: 330 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        `${p.cantidad} x ${formatoPesos.format(p.precio_unitario)} = ${formatoPesos.format(p.cantidad * p.precio_unitario)}`,
        MARGEN + 12,
        y + 44,
      );
      doc.setFontSize(7);
      doc.text(`Codigo: ${p.qr_code}`, MARGEN + 12, y + 78, { maxWidth: 330 });
      doc.addImage(await qr(p.qr_code), 'PNG', ANCHO_PAGINA - MARGEN - 82, y + 4, 80, 80);
      y += 98;
    }
  }

  // --- Productos canjeados con puntos ---
  if (datos.canjes.length > 0) {
    y = asegurarEspacio(doc, y, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Canjeados con puntos', MARGEN, y);
    y += 14;

    for (const c of datos.canjes) {
      y = asegurarEspacio(doc, y, 100);
      doc.setDrawColor(200);
      doc.rect(MARGEN, y, ANCHO_PAGINA - MARGEN * 2, 88);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(c.producto_nombre, MARGEN + 12, y + 24, { maxWidth: 330 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${formatoNumero.format(c.puntos_utilizados)} puntos`, MARGEN + 12, y + 44);
      doc.setFontSize(7);
      doc.text(`Codigo: ${c.qr_code}`, MARGEN + 12, y + 78, { maxWidth: 330 });
      doc.addImage(await qr(c.qr_code), 'PNG', ANCHO_PAGINA - MARGEN - 82, y + 4, 80, 80);
      y += 98;
    }
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Presenta este comprobante en el candy bar para retirar tus productos.', MARGEN, 820);

  doc.save(`productos-${datos.compraId}.pdf`);
}