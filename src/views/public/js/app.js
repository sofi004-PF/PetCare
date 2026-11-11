import { get, post, configurarSesionExpirada } from './api.js';
import { h, reemplazar, aviso, formulario } from './ui.js';
import { icono, logotipo } from './iconos.js';
import { MODULOS } from './modulos/index.js';
import { paginaResponder } from './modulos/recordatorios.js';
import { abrirAgendarCita, PUEDEN_AGENDAR } from './modulos/citas.js';

/**
 * Aplicación de una sola página (SPA) de PetCare.
 * Maneja el inicio de sesión, la navegación según el rol (HU-11) y el armazón
 * responsivo: barra lateral en escritorio, cajón en tableta y barra inferior en móvil.
 */
const estado = { usuario: null, modulos: [] };
const raiz = document.getElementById('app');

/** Áreas del menú lateral. */
const GRUPOS = [
  { titulo: 'Atención clínica', modulos: ['inicio', 'citas', 'consultas', 'historial', 'tratamientos', 'recetas', 'recordatorios'] },
  { titulo: 'Clientes', modulos: ['propietarios', 'notificaciones', 'facturas'] },
  { titulo: 'Administración', modulos: ['inventario', 'reportes', 'usuarios'] }
];

/** Accesos de la barra inferior en móvil (máximo 4 + "Más"), por rol. */
const BARRA_INFERIOR = {
  administrador: ['inicio', 'citas', 'historial', 'inventario'],
  veterinario: ['inicio', 'citas', 'consultas', 'historial'],
  recepcionista: ['inicio', 'citas', 'propietarios', 'facturas'],
  cliente: ['inicio', 'citas', 'propietarios', 'recordatorios']
};

configurarSesionExpirada(() => {
  if (estado.usuario) {
    aviso('Su sesión expiró. Inicie sesión nuevamente.', 'error');
    estado.usuario = null;
    mostrarLogin();
  }
});

async function iniciar() {
  // Página pública para responder recordatorios desde el mensaje (HU-03)
  const respuesta = location.hash.match(/^#\/responder\/([a-f0-9]+)$/);
  if (respuesta) {
    paginaResponder(raiz, respuesta[1]);
    return;
  }
  try {
    Object.assign(estado, await get('/auth/sesion'));
    mostrarAplicacion();
  } catch {
    mostrarLogin();
  }
}

function prepararRaiz() {
  raiz.className = '';
  raiz.removeAttribute('aria-busy');
}

/* ------------------------------------------------------------------------ */
/* Inicio de sesión                                                          */
/* ------------------------------------------------------------------------ */

function mostrarLogin() {
  prepararRaiz();
  document.title = 'Iniciar sesión · PetCare';
  const form = formulario([
    { nombre: 'correo', etiqueta: 'Correo', tipo: 'email', requerido: true, autocompletar: 'username', ancho: 'completo' },
    { nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true, autocompletar: 'current-password', ancho: 'completo' }
  ], async (datos) => {
    Object.assign(estado, await post('/auth/login', datos));
    location.hash = '#/inicio';
    mostrarAplicacion();
  }, { textoBoton: 'Ingresar' });

  reemplazar(raiz, h('main', { class: 'pantalla-login' },
    h('section', { class: 'login-marca', 'aria-label': 'PetCare' },
      h('div', { class: 'marca' }, logotipo(44), h('span', {}, h('span', { class: 'marca-nombre' }, 'PetCare'), h('span', { class: 'marca-sub' }, 'Clínica veterinaria'))),
      h('div', {},
        h('h1', {}, 'La historia clínica de cada paciente, siempre a mano.'),
        h('p', {}, 'Agenda, consultas, recetas, farmacia y facturación de la clínica en un solo lugar.')
      ),
      h('ul', { class: 'login-lista' },
        h('li', {}, icono('calendario', { tamano: 18 }), 'Citas en línea sin cruces de horario'),
        h('li', {}, icono('expediente', { tamano: 18 }), 'Historial clínico con archivos adjuntos'),
        h('li', {}, icono('jeringa', { tamano: 18 }), 'Recordatorios automáticos de vacunación')
      )
    ),
    h('section', { class: 'login-formulario' },
      h('div', { class: 'caja-login' },
        h('div', {}, h('h2', {}, 'Iniciar sesión'), h('p', { class: 'ayuda', style: 'margin-top:0.25rem' }, 'Use el correo con el que la clínica lo registró.')),
        form
      )
    )
  ));
  form.querySelector('input').focus();
}

/* ------------------------------------------------------------------------ */
/* Armazón de la aplicación                                                  */
/* ------------------------------------------------------------------------ */

/** Título del módulo según el rol del usuario (ej: "Mis mascotas" para clientes). */
function tituloDe(modulo) {
  return (modulo.tituloPara && modulo.tituloPara(estado.usuario.rol)) || modulo.titulo;
}

/** Módulos visibles para el usuario actual, en el orden del menú. */
function modulosPermitidos() {
  return MODULOS.filter((m) => estado.modulos.includes(m.id));
}

function iniciales(nombre) {
  return String(nombre).split(' ').filter((p) => !/^(dr|dra)\.?$/i.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function enlaceNav(modulo, clase) {
  return h('a', { class: clase, href: `#/${modulo.id}`, 'data-modulo': modulo.id }, icono(modulo.icono, { tamano: clase === 'nav-enlace' ? 20 : 22 }), h('span', {}, tituloDe(modulo)));
}

function botonAccionRapida() {
  if (PUEDEN_AGENDAR.includes(estado.usuario.rol)) {
    return h('button', { class: 'accion', 'aria-label': 'Agendar cita', onClick: () => abrirAgendarCita(contexto([])) },
      icono('mas', { tamano: 18 }), h('span', { class: 'ocultar-movil' }, 'Agendar cita'));
  }
  if (estado.usuario.rol === 'veterinario') {
    return h('a', { class: 'boton accion', href: '#/consultas/nueva', 'aria-label': 'Registrar consulta' },
      icono('estetoscopio', { tamano: 18 }), h('span', { class: 'ocultar-movil' }, 'Registrar consulta'));
  }
  return null;
}

function mostrarAplicacion() {
  prepararRaiz();
  const permitidos = modulosPermitidos().filter((m) => !m.oculto);
  const idLateral = 'menu-lateral';

  const lateral = h('aside', { class: 'lateral', id: idLateral, 'aria-label': 'Menú principal' },
    h('a', { class: 'marca', href: '#/inicio' }, logotipo(36), h('span', {}, h('span', { class: 'marca-nombre' }, 'PetCare'), h('span', { class: 'marca-sub' }, 'Clínica veterinaria'))),
    h('nav', { 'aria-label': 'Secciones' },
      GRUPOS.map((grupo) => {
        const enlaces = permitidos.filter((m) => grupo.modulos.includes(m.id));
        if (!enlaces.length) return null;
        const idTitulo = `grupo-${grupo.titulo.replace(/\s+/g, '-').toLowerCase()}`;
        return h('div', { class: 'nav-grupo', role: 'group', 'aria-labelledby': idTitulo },
          h('div', { class: 'nav-titulo', id: idTitulo }, grupo.titulo),
          enlaces.map((m) => enlaceNav(m, 'nav-enlace'))
        );
      })
    ),
    h('div', { class: 'lateral-pie' }, 'PetCare · Pasto, Nariño')
  );

  const velo = h('div', { class: 'velo', 'aria-hidden': 'true', onClick: () => alternarCajon(false) });
  const botonMenu = h('button', {
    class: 'fantasma icono-solo solo-movil',
    'aria-label': 'Abrir menú',
    'aria-expanded': 'false',
    'aria-controls': idLateral,
    onClick: () => alternarCajon(true)
  }, icono('menu'));

  const inferiores = (BARRA_INFERIOR[estado.usuario.rol] || [])
    .map((id) => permitidos.find((m) => m.id === id))
    .filter(Boolean);

  const contenido = h('main', { class: 'contenido', id: 'contenido', tabindex: '-1' });

  reemplazar(raiz,
    h('a', { class: 'saltar-contenido', href: '#contenido', onClick: (e) => { e.preventDefault(); contenido.focus(); } }, 'Saltar al contenido'),
    h('div', { class: 'app' },
      lateral,
      velo,
      h('div', { class: 'principal' },
        h('header', { class: 'barra-superior' },
          botonMenu,
          h('a', { class: 'marca', href: '#/inicio', 'aria-label': 'PetCare, ir al inicio' }, logotipo(32), h('span', { class: 'marca-nombre' }, 'PetCare')),
          h('div', { class: 'barra-superior-acciones' },
            botonAccionRapida(),
            h('div', { class: 'usuario' },
              h('span', { class: 'avatar', 'aria-hidden': 'true' }, iniciales(estado.usuario.nombre)),
              h('div', { class: 'usuario-datos' },
                h('div', { class: 'usuario-nombre' }, estado.usuario.nombre),
                h('div', { class: 'usuario-rol' }, estado.usuario.nombreRol)
              ),
              h('button', { class: 'fantasma icono-solo', 'aria-label': 'Cerrar sesión', title: 'Cerrar sesión', onClick: cerrarSesion }, icono('salir'))
            )
          )
        ),
        contenido
      ),
      h('nav', { class: 'barra-inferior', 'aria-label': 'Accesos rápidos' },
        inferiores.map((m) => enlaceNav(m, 'enlace-inferior')),
        h('button', { type: 'button', 'aria-label': 'Más secciones', 'aria-controls': idLateral, onClick: () => alternarCajon(true) }, icono('puntos', { tamano: 22 }), h('span', {}, 'Más'))
      )
    )
  );

  // Cerrar el cajón con Escape o al elegir una sección
  lateral.addEventListener('keydown', (e) => { if (e.key === 'Escape') alternarCajon(false); });
  lateral.addEventListener('click', (e) => { if (e.target.closest('a')) alternarCajon(false); });
  navegar();
}

function alternarCajon(abrir) {
  const lateral = document.getElementById('menu-lateral');
  const velo = document.querySelector('.velo');
  const boton = document.querySelector('[aria-controls="menu-lateral"][aria-expanded]');
  if (!lateral) return;
  lateral.classList.toggle('abierto', abrir);
  velo.classList.toggle('visible', abrir);
  if (boton) boton.setAttribute('aria-expanded', String(abrir));
  if (abrir) {
    const actual = lateral.querySelector('[aria-current="page"]') || lateral.querySelector('a');
    if (actual) actual.focus();
  }
}

async function cerrarSesion() {
  try {
    await post('/auth/logout');
  } finally {
    estado.usuario = null;
    location.hash = '';
    mostrarLogin();
  }
}

/** Contexto que reciben los módulos para dibujarse. */
function contexto(parametros) {
  return {
    usuario: estado.usuario,
    modulos: estado.modulos,
    parametros,
    puede: (modulo) => estado.modulos.includes(modulo),
    ir: (ruta) => { location.hash = ruta; },
    recargar: () => navegar()
  };
}

async function navegar() {
  if (!estado.usuario) return;
  const contenido = document.getElementById('contenido');
  if (!contenido) return;
  const [idModulo = 'inicio', ...parametros] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const modulo = modulosPermitidos().find((m) => m.id === idModulo);
  const activo = modulo && (modulo.menu || modulo.id);

  document.querySelectorAll('[data-modulo]').forEach((a) => {
    if (a.dataset.modulo === activo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (!modulo) {
    reemplazar(contenido, h('div', { class: 'tarjeta vacio' }, 'La página no existe o su rol no tiene acceso a ella.'));
    return;
  }
  document.title = `${tituloDe(modulo)} · PetCare`;
  reemplazar(contenido, h('p', { class: 'vacio', role: 'status' }, 'Cargando…'));
  try {
    await modulo.render(contenido, contexto(parametros.map(decodeURIComponent)));
  } catch (error) {
    reemplazar(contenido, h('div', { class: 'alerta peligro', role: 'alert' }, icono('alerta'), h('div', {}, error.message)));
  }
}

window.addEventListener('hashchange', () => {
  if (/^#\/responder\//.test(location.hash)) {
    iniciar();
    return;
  }
  if (estado.usuario && !document.getElementById('contenido')) {
    mostrarAplicacion();
    return;
  }
  if (!estado.usuario && !document.querySelector('.pantalla-login form')) {
    iniciar();
    return;
  }
  navegar();
});
iniciar();
