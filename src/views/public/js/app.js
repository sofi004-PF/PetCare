import { get, post, configurarSesionExpirada } from './api.js';
import { h, reemplazar, aviso } from './ui.js';
import { MODULOS } from './modulos/index.js';

/**
 * Aplicación de una sola página (SPA) de PetCare.
 * Maneja el inicio de sesión, el menú según el rol (HU-11) y la navegación.
 */
const estado = { usuario: null, modulos: [] };
const raiz = document.getElementById('app');

configurarSesionExpirada(() => {
  if (estado.usuario) {
    aviso('Su sesión expiró. Inicie sesión nuevamente.', 'error');
    estado.usuario = null;
    mostrarLogin();
  }
});

async function iniciar() {
  try {
    Object.assign(estado, await get('/auth/sesion'));
    mostrarAplicacion();
  } catch {
    mostrarLogin();
  }
}

function mostrarLogin() {
  raiz.className = '';
  const correo = h('input', { id: 'login-correo', type: 'email', required: true, autocomplete: 'username' });
  const password = h('input', { id: 'login-password', type: 'password', required: true, autocomplete: 'current-password' });
  const boton = h('button', { type: 'submit' }, 'Ingresar');
  const form = h('form', {
    onSubmit: async (evento) => {
      evento.preventDefault();
      boton.disabled = true;
      try {
        Object.assign(estado, await post('/auth/login', { correo: correo.value, password: password.value }));
        location.hash = '#/inicio';
        mostrarAplicacion();
      } catch (error) {
        aviso(error.message, 'error');
      } finally {
        boton.disabled = false;
      }
    }
  },
  h('div', { class: 'campo' }, h('label', { for: 'login-correo' }, 'Correo'), correo),
  h('div', { class: 'campo' }, h('label', { for: 'login-password' }, 'Contraseña'), password),
  boton
  );

  reemplazar(raiz, h('div', { class: 'pantalla-login' },
    h('div', { class: 'tarjeta caja-login' },
      h('div', { class: 'logo' }, '🐾 PetCare'),
      h('p', { style: 'text-align:center;color:var(--color-texto-suave);margin:0' }, 'Sistema de gestión de la clínica veterinaria'),
      form
    )
  ));
  correo.focus();
}

/** Título del módulo según el rol del usuario (ej: "Mis mascotas" para clientes). */
function tituloDe(modulo) {
  return (modulo.tituloPara && modulo.tituloPara(estado.usuario.rol)) || modulo.titulo;
}

/** Módulos visibles para el usuario actual, en el orden del menú. */
function modulosPermitidos() {
  return MODULOS.filter((m) => estado.modulos.includes(m.id));
}

function mostrarAplicacion() {
  raiz.className = '';
  const menu = h('nav', { class: 'menu', 'aria-label': 'Menú principal' },
    modulosPermitidos().filter((m) => !m.oculto).map((m) => h('a', { href: `#/${m.id}`, 'data-modulo': m.id }, h('span', { 'aria-hidden': 'true' }, m.icono), tituloDe(m)))
  );
  const contenido = h('main', { class: 'contenido', id: 'contenido' });

  reemplazar(raiz, h('div', { class: 'layout' },
    h('aside', { class: 'barra-lateral' },
      h('div', { class: 'logo' }, '🐾', h('div', {}, 'PetCare', h('small', {}, 'Clínica veterinaria'))),
      menu
    ),
    h('div', { class: 'principal' },
      h('header', { class: 'encabezado' },
        h('div', {}),
        h('div', { class: 'usuario-actual' },
          h('div', {}, h('strong', {}, estado.usuario.nombre), h('div', { class: 'rol' }, estado.usuario.nombreRol)),
          h('button', { class: 'secundario pequeno', onClick: cerrarSesion }, 'Cerrar sesión')
        )
      ),
      contenido
    )
  ));
  navegar();
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

  document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('activo', a.dataset.modulo === (modulo && (modulo.menu || modulo.id))));

  if (!modulo) {
    reemplazar(contenido, h('div', { class: 'tarjeta vacio' }, 'La página no existe o su rol no tiene acceso a ella.'));
    return;
  }
  document.title = `${tituloDe(modulo)} · PetCare`;
  reemplazar(contenido, h('p', { class: 'vacio' }, 'Cargando…'));
  try {
    await modulo.render(contenido, contexto(parametros.map(decodeURIComponent)));
  } catch (error) {
    reemplazar(contenido, h('div', { class: 'alerta peligro' }, error.message));
  }
}

window.addEventListener('hashchange', navegar);
iniciar();
