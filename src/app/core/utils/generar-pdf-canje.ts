import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { ResultadoCanje } from '../models/canje';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

/** Datos mínimos del titular que se imprimen en el comprobante. */
export interface TitularCanje {
  nombre: string;
  apellido: string;
}

/**
 * Genera el PDF del comprobante de canje (datos + QR + código a mano) y
 * dispara la descarga en el navegador. Todo se hace en el cliente, no
 * se sube a ningún lado: si en el futuro hace falta reabrirlo después,
 * habría que persistirlo en Supabase Storage en vez de solo descargarlo.
 */
export async function descargarPdfCanje(
  resultado: ResultadoCanje,
  titular: TitularCanje,
): Promise<void> {
  const qrDataUrl = await QRCode.toDataURL(resultado.qr_code, { margin: 1, width: 240 });

  const doc = new jsPDF({ unit: 'pt', format: [320, 440] });

  doc.setFontSize(16);
  doc.text('Comprobante de canje', 24, 36);

  doc.setFontSize(11);
  doc.text(`${titular.nombre} ${titular.apellido}`, 24, 62);
  doc.text(resultado.recompensa_nombre, 24, 80);
  doc.text(`Puntos utilizados: ${resultado.puntos_utilizados}`, 24, 98);
  doc.text(`Fecha: ${formatoFecha.format(new Date(resultado.fecha))}`, 24, 116);

  doc.addImage(qrDataUrl, 'PNG', 60, 136, 200, 200);

  doc.setFontSize(9);
  doc.text(`Código: ${resultado.qr_code}`, 24, 358, { maxWidth: 272 });
  doc.text('Presentá este comprobante en el candy bar para retirarlo.', 24, 378, {
    maxWidth: 272,
  });

  doc.save(`canje-${resultado.canje_id}.pdf`);
}