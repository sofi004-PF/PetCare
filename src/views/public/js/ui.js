import { icono, grupoEspecie } from './iconos.js';

/**
 * Utilidades de interfaz reutilizadas por todos los módulos de la página.
 * Todo el texto se inserta con textContent para evitar inyección de HTML.
 */

const PROPIEDADES = new Set(['value', 'checked', 'selected', 'disabled', 'required', 'multiple', 'hidden', 'noValidate']);
let contadorIds = 0;

/** @returns {string} Identificador único para asociar etiquetas y mensajes. */
export function nuevoId(prefijo = 'pc') {
  contadorIds += 1;
  return `${prefijo}-${contadorIds}`;
}

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

/* ------------------------------------------------------------------------ */
/* Avisos                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Muestra un aviso temporal. Los errores se anuncian de inmediato a lectores de pantalla.
 * @param {string} mensaje - Texto del aviso.
 * @param {'info'|'exito'|'error'} [tipo='info'] - Tipo de aviso.
 */
export function aviso(mensaje, tipo = 'info') {
  const nombreIcono = tipo === 'error' ? 'alerta' : tipo === 'exito' ? 'correcto' : 'campana';
  const elemento = h('div', { class: `aviso ${tipo}`, role: tipo === 'error' ? 'alert' : 'status' }, icono(nombreIcono, { tamano: 18 }), h('span', {}, mensaje));
  document.getElementById('avisos').append(elemento);
  requestAnimationFrame(() => requestAnimationFrame(() => elemento.classList.add('visible')));
  setTimeout(() => {
    elemento.classList.add('saliendo');
    setTimeout(() => elemento.remove(), 200);
  }, tipo === 'error' ? 6000 : 3500);
}

/* ------------------------------------------------------------------------ */
/* Modal accesible                                                           */
/* ------------------------------------------------------------------------ */

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let modalesAbiertos = 0;

/**
 * Abre una ventana modal (hoja inferior en móvil). Atrapa el foco, se cierra
 * con Escape o tocando fuera, y devuelve el foco al botón que la abrió.
 * @param {string} titulo - Título de la ventana.
 * @param {Node|Array<Node>} contenido - Contenido.
 * @param {{amplio?: boolean}} [opciones] - amplio: ventana más ancha (citas, facturas).
 * @returns {{cerrar: Function, cuerpo: HTMLElement}} Control de la ventana.
 */
export function abrirModal(titulo, contenido, { amplio = false } = {}) {
  const idTitulo = nuevoId('modal-titulo');
  const anterior = document.activeElement;
  const cuerpo = h('div', { class: 'modal-cuerpo' }, contenido);
  const ventana = h('div', { class: `modal${amplio ? ' amplio' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
    h('div', { class: 'modal-asa', 'aria-hidden': 'true' }),
    h('div', { class: 'modal-encabezado' },
      h('h2', { id: idTitulo }, titulo),
      h('button', { type: 'button', class: 'fantasma icono-solo', 'aria-label': 'Cerrar', onClick: () => cerrar() }, icono('cerrar'))
    ),
    cuerpo
  );
  const fondo = h('div', { class: 'fondo-modal' }, ventana);
  let cerrado = false;

  const alTeclear = (evento) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      cerrar();
      return;
    }
    if (evento.key !== 'Tab') return;
    const enfocables = [...ventana.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    fondo.classList.add('cerrando');
    fondo.removeEventListener('keydown', alTeclear);
    setTimeout(() => {
      fondo.remove();
      modalesAbiertos -= 1;
      if (modalesAbiertos === 0) document.body.style.overflow = '';
      if (anterior && document.contains(anterior)) anterior.focus();
    }, 200);
  }

  fondo.addEventListener('mousedown', (evento) => { if (evento.target === fondo) cerrar(); });
  fondo.addEventListener('keydown', alTeclear);
  document.body.append(fondo);
  modalesAbiertos += 1;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => fondo.classList.add('abierto')));

  const primerCampo = cuerpo.querySelector('input, select, textarea') || ventana.querySelector('button');
  if (primerCampo) primerCampo.focus({ preventScroll: true });
  return { cerrar, cuerpo };
}

/**
 * Pide confirmación al usuario (diálogo nativo, accesible por teclado).
 * @param {string} mensaje - Pregunta.
 * @returns {boolean} true si acepta.
 */
export function confirmar(mensaje) {
  return window.confirm(mensaje);
}

/* ------------------------------------------------------------------------ */
/* Formularios con validación en línea                                       */
/* ------------------------------------------------------------------------ */

/**
 * Mensaje de error en español para un control según la API de validación del navegador.
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} control - Control.
 * @param {Object} campo - Definición del campo.
 * @returns {string} Mensaje o cadena vacía si es válido.
 */
export function mensajeValidacion(control, campo = {}) {
  const v = control.validity;
  if (v.valid) return '';
  if (v.valueMissing) {
    if (control.tagName === 'SELECT') return 'Seleccione una opción.';
    if (control.type === 'file') return 'Seleccione un archivo.';
    return 'Este campo es obligatorio.';
  }
  if (v.typeMismatch && control.type === 'email') return 'Escriba un correo válido, por ejemplo nombre@correo.com.';
  if (v.tooShort) return `Debe tener al menos ${control.minLength} caracteres.`;
  if (v.badInput) return 'Escriba un número válido.';
  if (v.rangeUnderflow) return control.type === 'date' ? 'La fecha es anterior a la permitida.' : `El valor mínimo es ${control.min}.`;
  if (v.rangeOverflow) return control.type === 'date' ? 'La fecha es posterior a la permitida.' : `El valor máximo es ${control.max}.`;
  if (v.stepMismatch) return 'El valor no es válido.';
  if (v.patternMismatch) return campo.mensajePatron || 'El formato no es válido.';
  return 'Revise este campo.';
}

/**
 * Marca un control como válido o inválido y muestra el mensaje debajo de él.
 * @param {HTMLElement} control - Control del formulario.
 * @param {string} mensaje - Mensaje de error ('' si es válido).
 */
export function marcarCampo(control, mensaje) {
  const campo = control.closest('.campo');
  let error = campo && campo.querySelector('.error-campo');
  if (mensaje) {
    if (!error && campo) {
      error = h('p', { class: 'error-campo', id: nuevoId('error') });
      campo.append(error);
    }
    if (error) {
      reemplazar(error, icono('alerta', { tamano: 14 }), mensaje);
      const descritos = new Set((control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
      descritos.add(error.id);
      control.setAttribute('aria-describedby', [...descritos].join(' '));
    }
    control.setAttribute('aria-invalid', 'true');
  } else {
    control.removeAttribute('aria-invalid');
    if (error) error.remove();
  }
}

/**
 * Valida todos los controles de un contenedor y enfoca el primero inválido.
 * @param {HTMLElement} contenedor - Formulario o sección.
 * @param {Object<string, Object>} [definiciones] - Definición de campos por nombre (mensajes propios).
 * @returns {boolean} true si todo es válido.
 */
export function validarContenedor(contenedor, definiciones = {}) {
  let primero = null;
  for (const control of contenedor.querySelectorAll('input, select, textarea')) {
    if (control.type === 'hidden' || control.disabled) continue;
    const mensaje = mensajeValidacion(control, definiciones[control.name]);
    marcarCampo(control, mensaje);
    if (mensaje && !primero) primero = control;
  }
  if (primero) primero.focus();
  return !primero;
}

/**
 * Crea un formulario a partir de una lista de campos, con validación en línea:
 * los errores aparecen junto a cada campo al enviar y se actualizan al corregir.
 * @param {Array<Object>} campos - Definición de campos:
 *   {nombre, etiqueta, tipo ('text'|'email'|'tel'|'number'|'date'|'time'|'select'|'textarea'|'password'|'file'|'checkbox'),
 *    requerido, opciones: [{valor, texto}], valor, ayuda, ancho: 'completo', min, max, paso, minimo (longitud),
 *    patron, mensajePatron, placeholder, autocompletar, accept, alCambiar}
 * @param {(datos: Object, form: HTMLFormElement) => Promise<void>} alEnviar - Acción al enviar.
 * @param {Object} [opciones]
 * @param {string} [opciones.textoBoton='Guardar'] - Texto del botón principal.
 * @param {string} [opciones.claseBoton=''] - Clase del botón ('accion' para coral).
 * @returns {HTMLFormElement} Formulario.
 */
export function formulario(campos, alEnviar, { textoBoton = 'Guardar', claseBoton = '' } = {}) {
  const definiciones = Object.fromEntries(campos.map((c) => [c.nombre, c]));
  const resumen = h('div', { class: 'resumen-errores', role: 'alert', hidden: true });
  const form = h('form', { class: 'formulario', noValidate: true }, resumen);
  for (const campo of campos) form.append(crearCampo(campo));
  const boton = h('button', { type: 'submit', class: claseBoton }, textoBoton);
  form.append(h('div', { class: 'acciones ancho-completo' }, boton));

  // Revalida un campo en cuanto se corrige (solo si ya mostró un error)
  form.addEventListener('input', (evento) => {
    const control = evento.target;
    if (control.getAttribute('aria-invalid') === 'true') marcarCampo(control, mensajeValidacion(control, definiciones[control.name]));
  });
  form.addEventListener('focusout', (evento) => {
    const control = evento.target;
    if (control.matches('input, select, textarea') && control.value !== '' && !control.validity.valid) {
      marcarCampo(control, mensajeValidacion(control, definiciones[control.name]));
    }
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    resumen.hidden = true;
    if (!validarContenedor(form, definiciones)) return;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    try {
      await alEnviar(leerFormulario(form, campos), form);
    } catch (error) {
      reemplazar(resumen, icono('alerta', { tamano: 18 }), h('span', {}, error.message));
      resumen.hidden = false;
    } finally {
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
    }
  });
  return form;
}

function crearCampo(campo) {
  const id = nuevoId(`campo-${campo.nombre}`);
  const idAyuda = campo.ayuda ? `${id}-ayuda` : null;
  const comunes = { id, name: campo.nombre, required: campo.requerido, 'aria-describedby': idAyuda, onChange: campo.alCambiar };
  let control;
  if (campo.tipo === 'select') {
    control = h('select', comunes,
      campo.placeholder !== undefined ? h('option', { value: '' }, campo.placeholder) : null,
      (campo.opciones || []).map((op) => h('option', { value: op.valor, selected: String(op.valor) === String(campo.valor ?? '') }, op.texto))
    );
  } else if (campo.tipo === 'textarea') {
    control = h('textarea', { ...comunes, placeholder: campo.placeholder, minlength: campo.minimo });
    control.value = campo.valor ?? '';
  } else if (campo.tipo === 'checkbox') {
    control = h('input', { ...comunes, type: 'checkbox', checked: Boolean(campo.valor) });
    return h('div', { class: `campo campo-casilla${campo.ancho === 'completo' ? ' ancho-completo' : ''}` },
      control,
      h('div', {}, h('label', { for: id }, campo.etiqueta), campo.ayuda ? h('div', { class: 'ayuda', id: idAyuda }, campo.ayuda) : null)
    );
  } else {
    const tipo = campo.tipo || 'text';
    control = h('input', {
      ...comunes,
      type: tipo,
      min: campo.min,
      max: campo.max,
      step: campo.paso,
      minlength: campo.minimo,
      pattern: campo.patron,
      placeholder: campo.placeholder,
      accept: campo.accept,
      autocomplete: campo.autocompletar || (tipo === 'email' ? 'email' : tipo === 'tel' ? 'tel' : null),
      inputmode: tipo === 'number' ? 'decimal' : null
    });
    if (tipo !== 'file') control.value = campo.valor ?? '';
  }
  return h('div', { class: `campo${campo.ancho === 'completo' ? ' ancho-completo' : ''}` },
    h('label', { for: id }, campo.etiqueta, campo.requerido ? h('span', { class: 'obligatorio', 'aria-hidden': 'true' }, '*') : null),
    control,
    campo.ayuda ? h('span', { class: 'ayuda', id: idAyuda }, campo.ayuda) : null
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

/* ------------------------------------------------------------------------ */
/* Tablas, insignias y estructura                                            */
/* ------------------------------------------------------------------------ */

/**
 * Crea una tabla densa. En móvil cada fila se muestra como tarjeta y cada
 * celda lleva su encabezado (data-etiqueta).
 * @param {Array<{titulo: string, valor: (fila: Object) => *, clase?: string}>} columnas - Columnas.
 * @param {Array<Object>} filas - Datos.
 * @param {string} [mensajeVacio='No hay registros'] - Texto si no hay filas.
 * @returns {HTMLElement} Tabla dentro de un contenedor con desplazamiento.
 */
export function tabla(columnas, filas, mensajeVacio = 'No hay registros') {
  if (!filas.length) return h('p', { class: 'vacio' }, mensajeVacio);
  return h('div', { class: 'tabla-contenedor' },
    h('table', {},
      h('thead', {}, h('tr', {}, columnas.map((c) => h('th', { class: c.clase, scope: 'col' }, c.titulo || h('span', { class: 'solo-lector' }, 'Acciones'))))),
      h('tbody', {}, filas.map((fila) => h('tr', {}, columnas.map((c) => h('td', { class: c.clase, 'data-etiqueta': c.titulo || '' }, c.valor(fila))))))
    )
  );
}

/**
 * Crea una insignia de estado. El color nunca es la única señal: siempre lleva texto.
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
 * Enlace "Volver" con icono.
 * @param {string} destino - Ruta (#/...).
 * @param {string} [texto='Volver'] - Texto.
 * @returns {HTMLElement} Enlace con estilo de botón secundario.
 */
export function botonVolver(destino, texto = 'Volver') {
  return h('a', { class: 'boton secundario', href: destino }, icono('volver', { tamano: 18 }), texto);
}

/**
 * Botón o enlace con icono y texto.
 * @param {string} nombreIcono - Icono.
 * @param {string} texto - Texto visible.
 * @param {Object} atributos - Atributos (href para enlace, onClick para botón, class).
 * @returns {HTMLElement} Botón o enlace.
 */
export function botonIcono(nombreIcono, texto, atributos = {}) {
  const etiqueta = atributos.href ? 'a' : 'button';
  const clase = etiqueta === 'a' ? `boton ${atributos.class || ''}` : atributos.class;
  return h(etiqueta, { type: etiqueta === 'button' ? 'button' : null, ...atributos, class: clase }, icono(nombreIcono, { tamano: 18 }), texto);
}

/**
 * Avatar de paciente con el color de su grupo (perros, gatos, exóticos).
 * @param {string} especie - Especie de la mascota.
 * @returns {HTMLElement} Avatar.
 */
export function avatarEspecie(especie) {
  return h('span', { class: `avatar ${grupoEspecie(especie)}`, title: especie }, icono('huella', { tamano: 18 }));
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
