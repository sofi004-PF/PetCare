/**
 * Generador de documentos PDF sencillos (texto con fuentes Helvetica),
 * sin dependencias externas. Se usa para recetas y facturas.
 */

const ANCHO = 595; // A4 en puntos
const ALTO = 842;
const MARGEN = 50;
const COLOR_MARCA = '0.06 0.46 0.43';

/**
 * Escapa un texto para usarlo dentro de un string de PDF (codificación WinAnsi).
 * @param {string} texto - Texto en español.
 * @returns {string} Texto escapado.
 */
function escapar(texto) {
  return String(texto)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Divide un texto largo en líneas de un máximo aproximado de caracteres.
 * @param {string} texto - Texto.
 * @param {number} maximo - Caracteres por línea.
 * @returns {Array<string>} Líneas.
 */
function partir(texto, maximo) {
  const lineas = [];
  for (const parrafo of String(texto).split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(' ')) {
      if ((actual + ' ' + palabra).trim().length > maximo && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = (actual + ' ' + palabra).trim();
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

/**
 * Contrato: Genera un PDF a partir de bloques de contenido.
 * @param {string} titulo - Título del documento (metadatos).
 * @param {Array<{texto?: string, tamano?: number, negrita?: boolean, separador?: boolean, espacio?: number, columnas?: Array<string>, anchos?: Array<number>}>} bloques
 *   Cada bloque es una línea de texto, un separador horizontal, un espacio vertical o una fila de tabla (columnas).
 * @returns {Buffer} Contenido del archivo PDF.
 */
function generarPDF(titulo, bloques) {
  const paginas = [[]];
  let y = ALTO - MARGEN;

  const nuevaLinea = (alto) => {
    if (y - alto < MARGEN) {
      paginas.push([]);
      y = ALTO - MARGEN;
    }
    y -= alto;
    return paginas[paginas.length - 1];
  };

  for (const bloque of bloques) {
    if (bloque.espacio) {
      y -= bloque.espacio;
      continue;
    }
    if (bloque.separador) {
      const pagina = nuevaLinea(8);
      pagina.push(`${COLOR_MARCA} RG 1 w ${MARGEN} ${y + 4} m ${ANCHO - MARGEN} ${y + 4} l S`);
      continue;
    }
    const tamano = bloque.tamano || 11;
    const fuente = bloque.negrita ? 'F2' : 'F1';
    const color = bloque.color === 'marca' ? `${COLOR_MARCA} rg` : '0 0 0 rg';
    if (bloque.columnas) {
      const pagina = nuevaLinea(tamano * 1.5);
      let x = MARGEN;
      bloque.columnas.forEach((columna, i) => {
        const ancho = (bloque.anchos || [])[i] || Math.floor((ANCHO - 2 * MARGEN) / bloque.columnas.length);
        const alineada = bloque.alinearDerecha && bloque.alinearDerecha[i]
          ? x + ancho - 6 - String(columna).length * tamano * 0.5
          : x;
        pagina.push(`BT ${color} /${fuente} ${tamano} Tf ${alineada.toFixed(1)} ${y} Td (${escapar(columna)}) Tj ET`);
        x += ancho;
      });
      continue;
    }
    const maximo = Math.floor((ANCHO - 2 * MARGEN) / (tamano * 0.5));
    for (const linea of partir(bloque.texto ?? '', maximo)) {
      const pagina = nuevaLinea(tamano * 1.45);
      pagina.push(`BT ${color} /${fuente} ${tamano} Tf ${MARGEN} ${y} Td (${escapar(linea)}) Tj ET`);
    }
  }

  // Ensamblado de objetos PDF
  const objetos = [];
  const agregar = (contenido) => {
    objetos.push(contenido);
    return objetos.length;
  };
  const idCatalogo = agregar(null);
  const idPaginas = agregar(null);
  const idFuente = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const idFuenteNegrita = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const idInfo = agregar(`<< /Title (${escapar(titulo)}) /Producer (PetCare) >>`);
  const idsPagina = paginas.map((comandos, i) => {
    const pie = `BT 0.4 0.4 0.4 rg /F1 8 Tf ${MARGEN} 25 Td (${escapar(`PetCare - Página ${i + 1} de ${paginas.length}`)}) Tj ET`;
    const flujo = [...comandos, pie].join('\n');
    const idContenido = agregar(`<< /Length ${Buffer.byteLength(flujo, 'latin1')} >>\nstream\n${flujo}\nendstream`);
    return agregar(`<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Contents ${idContenido} 0 R /Resources << /Font << /F1 ${idFuente} 0 R /F2 ${idFuenteNegrita} 0 R >> >> >>`);
  });
  objetos[idCatalogo - 1] = `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;
  objetos[idPaginas - 1] = `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPagina.length} >>`;

  let salida = '%PDF-1.4\n';
  const posiciones = [];
  objetos.forEach((contenido, i) => {
    posiciones.push(Buffer.byteLength(salida, 'latin1'));
    salida += `${i + 1} 0 obj\n${contenido}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(salida, 'latin1');
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  salida += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  return Buffer.from(salida, 'latin1');
}

module.exports = { generarPDF };
