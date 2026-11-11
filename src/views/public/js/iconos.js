/**
 * Iconos SVG de la interfaz (trazo de 2 px, cuadrícula de 24 px).
 * Reemplazan a los emoji: se ven igual en todos los sistemas operativos,
 * heredan el color del texto (currentColor) y son decorativos por defecto
 * (aria-hidden) salvo que se les dé una etiqueta.
 */
const NS = 'http://www.w3.org/2000/svg';

const TRAZOS = {
  inicio: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  estetoscopio: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/>',
  expediente: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  pildora: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  receta: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  jeringa: '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
  personas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  factura: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
  paquete: '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  huella: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  mas: '<path d="M5 12h14M12 5v14"/>',
  buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  volver: '<path d="m15 18-6-6 6-6"/>',
  descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  correcto: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>',
  puntos: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  correo: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  mensaje: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  telefono: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  imprimir: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
};

/**
 * Crea un icono SVG.
 * @param {string} nombre - Clave de TRAZOS.
 * @param {Object} [opciones]
 * @param {number} [opciones.tamano=20] - Tamaño en píxeles.
 * @param {string} [opciones.etiqueta] - Texto accesible; sin él, el icono es decorativo.
 * @param {string} [opciones.clase] - Clase CSS adicional.
 * @returns {SVGElement} Icono.
 */
export function icono(nombre, { tamano = 20, etiqueta = null, clase = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', tamano);
  svg.setAttribute('height', tamano);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', `icono ${clase}`.trim());
  if (etiqueta) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', etiqueta);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
  svg.innerHTML = TRAZOS[nombre] || TRAZOS.huella;
  return svg;
}

/**
 * Marca de PetCare: huella con la almohadilla en forma de cruz médica.
 * @param {number} [tamano=36] - Tamaño en píxeles.
 * @returns {SVGElement} Logotipo (decorativo; el nombre va como texto al lado).
 */
export function logotipo(tamano = 36) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', tamano);
  svg.setAttribute('height', tamano);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'logotipo');
  svg.innerHTML = `
    <rect width="64" height="64" rx="15" fill="#0D9488"/>
    <g fill="#fff">
      <ellipse cx="17.5" cy="25" rx="4.6" ry="5.8" transform="rotate(-22 17.5 25)"/>
      <ellipse cx="26.5" cy="16.5" rx="4.6" ry="6" transform="rotate(-6 26.5 16.5)"/>
      <ellipse cx="37.5" cy="16.5" rx="4.6" ry="6" transform="rotate(6 37.5 16.5)"/>
      <ellipse cx="46.5" cy="25" rx="4.6" ry="5.8" transform="rotate(22 46.5 25)"/>
      <rect x="26.5" y="27" width="11" height="28" rx="3.5"/>
      <rect x="18" y="35.5" width="28" height="11" rx="3.5"/>
    </g>`;
  return svg;
}

/** Grupo de especie para filtros y avatares: perros, gatos o exóticos. */
export function grupoEspecie(especie) {
  if (especie === 'Canino') return 'perros';
  if (especie === 'Felino') return 'gatos';
  return 'exoticos';
}
