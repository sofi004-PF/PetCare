/**
 * Utilidades de interfaz reutilizadas por todos los módulos de la página.
 * Todo el texto se inserta con textContent para evitar inyección de HTML.
 */

const PROPIEDADES = new Set(['value', 'checked', 'selected', 'disabled', 'required', 'multiple', 'hidden']);

/**
 * Crea un elemento del DOM.
 * @param {string} etiqueta - Nombre de la etiqueta HTML.
 * @param {Object} [atributos] - Atributos, clases (class) y eventos (onClick, onSubmit...).
 * @param {...(Node|string|number|Array|null)} hijos - Contenido.
 * @returns {HTMLElement} Elemento creado.
 */
export function h(etiqueta, atributos = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (clave === 'class') {
      elemento.className = valor;
    } else if (PROPIEDADES.has(clave)) {
      elemento[clave] = valor;
    } else {
      elemento.setAttribute(clave, valor === true ? '' : valor);
    }
  }
  agregar(elemento, hijos);
  return elemento;
}

function agregar(padre, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

/**
 * Reemplaza el contenido de un elemento.
 * @param {HTMLElement} elemento - Contenedor.
 * @param {...*} hijos - Nuevo contenido.
 */
export function reemplazar(elemento, ...hijos) {
  elemento.replaceChildren();
  agregar(elemento, hijos);
}

/**
 * Muestra un aviso temporal en la esquina de la pantalla.
 * @param {string} mensaje - Texto del aviso.
 * @param {'info'|'exito'|'error'} [tipo='info'] - Tipo de aviso.
 */
export function aviso(mensaje, tipo = 'info') {
  const elemento = h('div', { class: `aviso ${tipo}`, role: 'status' }, mensaje);
  document.getElementById('avisos').append(elemento);
  setTimeout(() => elemento.remove(), tipo === 'error' ? 6000 : 3500);
}

/**
 * Abre una ventana modal.
 * @param {string} titulo - Título de la ventana.
 * @param {Node|Array<Node>} contenido - Contenido.
 * @returns {{cerrar: Function, cuerpo: HTMLElement}} Control de la ventana.
 */
export function abrirModal(titulo, contenido) {
  const cuerpo = h('div', { class: 'modal-cuerpo' }, contenido);
  const fondo = h('div', { class: 'fondo-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'modal' },
      h('div', { class: 'modal-encabezado' },
        h('h2', {}, titulo),
        h('button', { type: 'button', 'aria-label': 'Cerrar', onClick: () => cerrar() }, '×')
      ),
      cuerpo
    )
  );
  const alTeclear = (evento) => { if (evento.key === 'Escape') cerrar(); };
  function cerrar() {
    fondo.remove();
    document.removeEventListener('keydown', alTeclear);
  }
  fondo.addEventListener('mousedown', (evento) => { if (evento.target === fondo) cerrar(); });
  document.addEventListener('keydown', alTeclear);
  document.body.append(fondo);
  const primerCampo = cuerpo.querySelector('input, select, textarea');
  if (primerCampo) primerCampo.focus();
  return { cerrar, cuerpo };
}

/**
 * Pide confirmación al usuario.
 * @param {string} mensaje - Pregunta.
 * @returns {boolean} true si acepta.
 */
export function confirmar(mensaje) {
  return window.confirm(mensaje);
}

/**
 * Crea un formulario a partir de una lista de campos.
 * @param {Array<Object>} campos - Definición de campos:
 *   {nombre, etiqueta, tipo ('text'|'email'|'number'|'date'|'time'|'select'|'textarea'|'password'|'file'|'checkbox'),
 *    requerido, opciones: [{valor, texto}], valor, ayuda, ancho: 'completo', min, max, paso, placeholder, alCambiar}
 * @param {(datos: Object, form: HTMLFormElement) => Promise<void>} alEnviar - Acción al enviar.
 * @param {Object} [opciones]
 * @param {string} [opciones.textoBoton='Guardar'] - Texto del botón principal.
 * @returns {HTMLFormElement} Formulario.
 */
export function formulario(campos, alEnviar, { textoBoton = 'Guardar' } = {}) {
  const form = h('form', { class: 'formulario', novalidate: false });
  for (const campo of campos) {
    form.append(crearCampo(campo));
  }
  const boton = h('button', { type: 'submit' }, textoBoton);
  form.append(h('div', { class: 'acciones ancho-completo' }, boton));
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    boton.disabled = true;
    try {
      await alEnviar(leerFormulario(form, campos), form);
    } catch (error) {
      aviso(error.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
  return form;
}

function crearCampo(campo) {
  const id = `campo-${campo.nombre}-${Math.random().toString(36).slice(2, 7)}`;
  let control;
  if (campo.tipo === 'select') {
    control = h('select', { id, name: campo.nombre, required: campo.requerido, onChange: campo.alCambiar },
      campo.placeholder !== undefined ? h('option', { value: '' }, campo.placeholder) : null,
      (campo.opciones || []).map((op) => h('option', { value: op.valor, selected: String(op.valor) === String(campo.valor ?? '') }, op.texto))
    );
  } else if (campo.tipo === 'textarea') {
    control = h('textarea', { id, name: campo.nombre, required: campo.requerido, placeholder: campo.placeholder });
    control.value = campo.valor ?? '';
  } else if (campo.tipo === 'checkbox') {
    control = h('input', { id, name: campo.nombre, type: 'checkbox', checked: Boolean(campo.valor), onChange: campo.alCambiar });
    control.style.width = 'auto';
  } else {
    control = h('input', {
      id,
      name: campo.nombre,
      type: campo.tipo || 'text',
      required: campo.requerido,
      min: campo.min,
      max: campo.max,
      step: campo.paso,
      placeholder: campo.placeholder,
      accept: campo.accept,
      onChange: campo.alCambiar
    });
    if (campo.tipo !== 'file') control.value = campo.valor ?? '';
  }
  return h('div', { class: `campo${campo.ancho === 'completo' ? ' ancho-completo' : ''}` },
    h('label', { for: id }, campo.etiqueta, campo.requerido ? ' *' : ''),
    control,
    campo.ayuda ? h('span', { class: 'ayuda' }, campo.ayuda) : null
  );
}

function leerFormulario(form, campos) {
  const datos = {};
  for (const campo of campos) {
    const control = form.elements[campo.nombre];
    if (!control) continue;
    if (campo.tipo === 'checkbox') datos[campo.nombre] = control.checked;
    else if (campo.tipo === 'file') datos[campo.nombre] = control.files[0] || null;
    else if (campo.tipo === 'number') datos[campo.nombre] = control.value === '' ? null : Number(control.value);
    else datos[campo.nombre] = control.value.trim();
  }
  return datos;
}

/**
 * Crea una tabla.
 * @param {Array<{titulo: string, valor: (fila: Object) => *, clase?: string}>} columnas - Columnas.
 * @param {Array<Object>} filas - Datos.
 * @param {string} [mensajeVacio='No hay registros'] - Texto si no hay filas.
 * @returns {HTMLElement} Tabla dentro de un contenedor con desplazamiento.
 */
export function tabla(columnas, filas, mensajeVacio = 'No hay registros') {
  if (!filas.length) return h('p', { class: 'vacio' }, mensajeVacio);
  return h('div', { class: 'tabla-contenedor' },
    h('table', {},
      h('thead', {}, h('tr', {}, columnas.map((c) => h('th', { class: c.clase }, c.titulo)))),
      h('tbody', {}, filas.map((fila) => h('tr', {}, columnas.map((c) => h('td', { class: c.clase }, c.valor(fila))))))
    )
  );
}

/**
 * Crea una insignia de estado.
 * @param {string} texto - Texto.
 * @param {''|'exito'|'peligro'|'alerta'|'info'} [tipo=''] - Color.
 * @returns {HTMLElement} Insignia.
 */
export function insignia(texto, tipo = '') {
  return h('span', { class: `insignia ${tipo}` }, texto);
}

/**
 * Encabezado de una página con título, descripción y acciones.
 * @param {string} titulo - Título.
 * @param {string} [descripcion] - Texto descriptivo.
 * @param {...Node} acciones - Botones.
 * @returns {HTMLElement} Encabezado.
 */
export function encabezado(titulo, descripcion, ...acciones) {
  return h('div', { class: 'titulo-pagina' },
    h('div', {}, h('h1', {}, titulo), descripcion ? h('p', {}, descripcion) : null),
    h('div', { class: 'acciones' }, acciones)
  );
}

/**
 * Lista de datos (definición: etiqueta → valor).
 * @param {Array<[string, *]>} pares - Pares [etiqueta, valor].
 * @returns {HTMLElement} Lista.
 */
export function listaDatos(pares) {
  return h('dl', { class: 'lista-datos' }, pares.flatMap(([etiqueta, valor]) => [h('dt', {}, etiqueta), h('dd', {}, valor ?? '—')]));
}

const FORMATO_MONEDA = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** @param {number} valor @returns {string} Valor en pesos colombianos. */
export function moneda(valor) {
  return FORMATO_MONEDA.format(Number(valor) || 0);
}

/** @param {string} fecha - "AAAA-MM-DD" o fecha y hora. @returns {string} Fecha legible. */
export function fecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** @param {string} fechaHora - "AAAA-MM-DD HH:MM:SS". @returns {string} Fecha y hora legibles. */
export function fechaHora(fechaHora) {
  if (!fechaHora) return '—';
  return `${fecha(fechaHora)} ${String(fechaHora).slice(11, 16)}`;
}

/** @returns {string} Fecha de hoy en formato AAAA-MM-DD (hora local). */
export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convierte un archivo a base64 para enviarlo a la API.
 * @param {File} archivo - Archivo seleccionado.
 * @returns {Promise<string>} Contenido en base64 (sin encabezado data:).
 */
export function archivoABase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1]);
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}
