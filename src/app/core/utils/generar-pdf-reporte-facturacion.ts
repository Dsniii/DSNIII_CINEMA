import { jsPDF } from 'jspdf';
import { ReporteFacturacion } from '../../features/admin/models/reporte-facturacion';
import {
  diaLegible,
  generadoLegible,
  nombreArchivoReporte,
  periodoLegible,
  pesos,
} from './formato-reporte-facturacion';

const MARGEN = 40;
const ALTO_FILA = 20;

interface Columna {
  titulo: string;
  /** Posición del borde derecho (los números se alinean a la derecha). */
  derecha: number;
}

const COLUMNAS: Columna[] = [
  { titulo: 'Fecha', derecha: 120 },
  { titulo: 'Compras', derecha: 185 },
  { titulo: 'Entradas', derecha: 255 },
  { titulo: 'Subtotal', derecha: 345 },
  { titulo: 'Descuentos', derecha: 430 },
  { titulo: 'Crédito', derecha: 500 },
  { titulo: 'Facturado', derecha: 555 },
];

/**
 * Arma el PDF del reporte de facturación y ventas (A4 vertical): encabezado con el período,
 * los dos números clave (facturado y entradas vendidas) y el detalle día por día.
 * Se genera en el navegador, no se sube a ningún lado.
 */
export function crearPdfReporteFacturacion(reporte: ReporteFacturacion): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const { totales } = reporte;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Reporte de facturación y ventas diarias', MARGEN, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(periodoLegible(reporte), MARGEN, 74);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Generado el ${generadoLegible(reporte)}`, MARGEN, 90);
  doc.setTextColor(0);

  // Resumen: lo que pidió el cliente.
  doc.setDrawColor(190);
  doc.rect(MARGEN, 108, (ancho - MARGEN * 2) / 2 - 6, 60);
  doc.rect(ancho / 2 + 6, 108, (ancho - MARGEN * 2) / 2 - 6, 60);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text('FACTURADO', MARGEN + 12, 126);
  doc.text('ENTRADAS VENDIDAS', ancho / 2 + 18, 126);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pesos(totales.facturado), MARGEN + 12, 153);
  doc.text(String(totales.entradas), ancho / 2 + 18, 153);

  let y = 196;
  const encabezado = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(235, 235, 235);
    doc.rect(MARGEN, y - 14, ancho - MARGEN * 2, ALTO_FILA, 'F');
    COLUMNAS.forEach((columna, indice) => {
      if (indice === 0) {
        doc.text(columna.titulo, MARGEN + 6, y);
      } else {
        doc.text(columna.titulo, columna.derecha, y, { align: 'right' });
      }
    });
    y += ALTO_FILA;
  };

  const fila = (valores: string[], negrita = false) => {
    if (y > alto - MARGEN - ALTO_FILA) {
      doc.addPage();
      y = MARGEN + 14;
      encabezado();
    }
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(9);
    valores.forEach((valor, indice) => {
      if (indice === 0) {
        doc.text(valor, MARGEN + 6, y);
      } else {
        doc.text(valor, COLUMNAS[indice].derecha, y, { align: 'right' });
      }
    });
    doc.setDrawColor(225);
    doc.line(MARGEN, y + 6, ancho - MARGEN, y + 6);
    y += ALTO_FILA;
  };

  encabezado();
  for (const dia of reporte.dias) {
    fila([
      diaLegible(dia.fecha),
      String(dia.compras),
      String(dia.entradas),
      pesos(dia.subtotal),
      pesos(dia.descuentos),
      pesos(dia.credito),
      pesos(dia.facturado),
    ]);
  }
  fila(
    [
      'TOTAL',
      String(totales.compras),
      String(totales.entradas),
      pesos(totales.subtotal),
      pesos(totales.descuentos),
      pesos(totales.credito),
      pesos(totales.facturado),
    ],
    true,
  );

  y += 10;
  if (y > alto - MARGEN) {
    doc.addPage();
    y = MARGEN + 14;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(
    'Solo compras confirmadas. Facturado = total cobrado (ya descontados cupón y crédito). ' +
      'Entradas vendidas = entradas emitidas en esas compras.',
    MARGEN,
    y,
    { maxWidth: ancho - MARGEN * 2 },
  );

  return doc;
}

/** Genera el PDF del reporte y dispara la descarga en el navegador. */
export function descargarPdfReporteFacturacion(reporte: ReporteFacturacion): void {
  crearPdfReporteFacturacion(reporte).save(`${nombreArchivoReporte(reporte)}.pdf`);
}
