import { strToU8, zipSync } from 'fflate';
import { ReporteFacturacion } from '../../features/admin/models/reporte-facturacion';
import { fechaLocal } from '../../features/admin/utils/armar-reporte-facturacion';
import {
  generadoLegible,
  nombreArchivoReporte,
  periodoLegible,
} from './formato-reporte-facturacion';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NOMBRE_HOJA = 'Facturación diaria';

/** Índices de `cellXfs` definidos en `ESTILOS`. */
enum Estilo {
  Normal = 0,
  Titulo = 1,
  Encabezado = 2,
  Fecha = 3,
  Entero = 4,
  Pesos = 5,
  TotalTexto = 6,
  TotalEntero = 7,
  TotalPesos = 8,
}

const ENCABEZADOS = [
  'Fecha',
  'Compras',
  'Entradas vendidas',
  'Subtotal',
  'Descuentos',
  'Crédito utilizado',
  'Facturado',
];
const ANCHOS = [14, 11, 18, 16, 16, 18, 18];
const FILA_ENCABEZADO = 5;

const ENCABEZADO_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const CONTENT_TYPES =
  ENCABEZADO_XML +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const RELS_RAIZ =
  ENCABEZADO_XML +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const RELS_LIBRO =
  ENCABEZADO_XML +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

const LIBRO =
  ENCABEZADO_XML +
  `<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
  `<sheets><sheet name="${NOMBRE_HOJA}" sheetId="1" r:id="rId1"/></sheets>` +
  '</workbook>';

const ESTILOS =
  ENCABEZADO_XML +
  `<styleSheet xmlns="${NS}">` +
  '<numFmts count="2">' +
  '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>' +
  '<numFmt numFmtId="165" formatCode="&quot;$&quot;\\ #,##0.00"/>' +
  '</numFmts>' +
  '<fonts count="3">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="14"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top style="thin"><color auto="1"/></top><bottom/><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="9">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
  '<xf numFmtId="1" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  '<xf numFmtId="165" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caracteres de control que no son válidos en XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function letra(columna: number): string {
  return String.fromCharCode(65 + columna);
}

function celdaTexto(columna: number, fila: number, texto: string, estilo: Estilo): string {
  return (
    `<c r="${letra(columna)}${fila}" s="${estilo}" t="inlineStr">` +
    `<is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`
  );
}

function celdaNumero(columna: number, fila: number, valor: number, estilo: Estilo): string {
  return `<c r="${letra(columna)}${fila}" s="${estilo}"><v>${valor}</v></c>`;
}

function celdaFormula(
  columna: number,
  fila: number,
  formula: string,
  valor: number,
  estilo: Estilo,
): string {
  return `<c r="${letra(columna)}${fila}" s="${estilo}"><f>${formula}</f><v>${valor}</v></c>`;
}

/** Número de serie de Excel (días desde 1899-12-30) para un día calendario `AAAA-MM-DD`. */
function serieExcel(fecha: string): number | null {
  const dia = fechaLocal(fecha);
  if (!dia) {
    return null;
  }
  return Date.UTC(dia.getFullYear(), dia.getMonth(), dia.getDate()) / 86_400_000 + 25_569;
}

function fila(numero: number, celdas: string[], altura?: number): string {
  const atributos = altura ? ` ht="${altura}" customHeight="1"` : '';
  return `<row r="${numero}"${atributos}>${celdas.join('')}</row>`;
}

function hojaXml(reporte: ReporteFacturacion): string {
  const filas: string[] = [];
  filas.push(fila(1, [celdaTexto(0, 1, 'Reporte de facturación y ventas diarias', Estilo.Titulo)]));
  filas.push(fila(2, [celdaTexto(0, 2, periodoLegible(reporte), Estilo.Normal)]));
  filas.push(fila(3, [celdaTexto(0, 3, `Generado el ${generadoLegible(reporte)}`, Estilo.Normal)]));
  filas.push(
    fila(
      FILA_ENCABEZADO,
      ENCABEZADOS.map((titulo, i) => celdaTexto(i, FILA_ENCABEZADO, titulo, Estilo.Encabezado)),
      30,
    ),
  );

  let numeroFila = FILA_ENCABEZADO + 1;
  for (const dia of reporte.dias) {
    const serie = serieExcel(dia.fecha);
    filas.push(
      fila(numeroFila, [
        serie === null
          ? celdaTexto(0, numeroFila, dia.fecha, Estilo.Normal)
          : celdaNumero(0, numeroFila, serie, Estilo.Fecha),
        celdaNumero(1, numeroFila, dia.compras, Estilo.Entero),
        celdaNumero(2, numeroFila, dia.entradas, Estilo.Entero),
        celdaNumero(3, numeroFila, dia.subtotal, Estilo.Pesos),
        celdaNumero(4, numeroFila, dia.descuentos, Estilo.Pesos),
        celdaNumero(5, numeroFila, dia.credito, Estilo.Pesos),
        celdaNumero(6, numeroFila, dia.facturado, Estilo.Pesos),
      ]),
    );
    numeroFila++;
  }

  const primera = FILA_ENCABEZADO + 1;
  const ultima = numeroFila - 1;
  const suma = (columna: number) => `SUM(${letra(columna)}${primera}:${letra(columna)}${ultima})`;
  const { totales } = reporte;
  filas.push(
    fila(numeroFila, [
      celdaTexto(0, numeroFila, 'TOTAL', Estilo.TotalTexto),
      celdaFormula(1, numeroFila, suma(1), totales.compras, Estilo.TotalEntero),
      celdaFormula(2, numeroFila, suma(2), totales.entradas, Estilo.TotalEntero),
      celdaFormula(3, numeroFila, suma(3), totales.subtotal, Estilo.TotalPesos),
      celdaFormula(4, numeroFila, suma(4), totales.descuentos, Estilo.TotalPesos),
      celdaFormula(5, numeroFila, suma(5), totales.credito, Estilo.TotalPesos),
      celdaFormula(6, numeroFila, suma(6), totales.facturado, Estilo.TotalPesos),
    ]),
  );
  numeroFila += 2;
  filas.push(
    fila(numeroFila, [
      celdaTexto(
        0,
        numeroFila,
        'Solo compras confirmadas. Facturado = total cobrado (ya descontados cupón y crédito).',
        Estilo.Normal,
      ),
    ]),
  );

  const columnas = ANCHOS.map(
    (ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`,
  ).join('');

  return (
    ENCABEZADO_XML +
    `<worksheet xmlns="${NS}">` +
    `<dimension ref="A1:${letra(ENCABEZADOS.length - 1)}${numeroFila}"/>` +
    '<sheetViews><sheetView workbookViewId="0">' +
    `<pane ySplit="${FILA_ENCABEZADO}" topLeftCell="A${FILA_ENCABEZADO + 1}" activePane="bottomLeft" state="frozen"/>` +
    '</sheetView></sheetViews>' +
    `<cols>${columnas}</cols>` +
    `<sheetData>${filas.join('')}</sheetData>` +
    '</worksheet>'
  );
}

/** Arma el archivo `.xlsx` del reporte (un único libro con una hoja) y lo devuelve como bytes. */
export function crearExcelReporteFacturacion(reporte: ReporteFacturacion): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELS_RAIZ),
    'xl/workbook.xml': strToU8(LIBRO),
    'xl/_rels/workbook.xml.rels': strToU8(RELS_LIBRO),
    'xl/styles.xml': strToU8(ESTILOS),
    'xl/worksheets/sheet1.xml': strToU8(hojaXml(reporte)),
  });
}

/** Genera el Excel del reporte y dispara la descarga en el navegador. */
export function descargarExcelReporteFacturacion(reporte: ReporteFacturacion): void {
  const bytes = crearExcelReporteFacturacion(reporte);
  const blob = new Blob([bytes as BlobPart], { type: TIPO_XLSX });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombreArchivoReporte(reporte)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
