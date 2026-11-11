/**
 * Matriz de permisos de PetCare (HU-11).
 * Define qué roles pueden usar cada módulo del sistema. Es la única fuente
 * de verdad: la usan tanto la API (middleware) como el menú de la página.
 */

/** Roles disponibles en el sistema. */
const ROLES = {
  administrador: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Personal administrativo',
  cliente: 'Dueño de mascota'
};

const TODOS = Object.keys(ROLES);

/** Módulo → roles con acceso. */
const PERMISOS = {
  inicio: TODOS,
  usuarios: ['administrador'],
  propietarios: TODOS,
  mascotas: TODOS,
  citas: TODOS,
  notificaciones: ['administrador', 'recepcionista', 'cliente'],
  consultas: ['administrador', 'veterinario'],
  historial: ['administrador', 'veterinario', 'cliente'],
  tratamientos: ['administrador', 'veterinario', 'cliente'],
  recetas: ['administrador', 'veterinario', 'cliente'],
  recordatorios: ['administrador', 'veterinario', 'recepcionista', 'cliente'],
  inventario: ['administrador'],
  facturas: ['administrador', 'recepcionista', 'cliente']
};

/**
 * Contrato: Indica si un rol tiene acceso a un módulo.
 * @param {string} rol - Rol del usuario.
 * @param {string} modulo - Identificador del módulo.
 * @returns {boolean} true si el rol puede usar el módulo.
 */
function puedeAcceder(rol, modulo) {
  return (PERMISOS[modulo] || []).includes(rol);
}

/**
 * Contrato: Lista los módulos a los que un rol tiene acceso.
 * @param {string} rol - Rol del usuario.
 * @returns {Array<string>} Identificadores de módulos permitidos.
 */
function modulosDe(rol) {
  return Object.keys(PERMISOS).filter((modulo) => puedeAcceder(rol, modulo));
}

module.exports = { ROLES, PERMISOS, puedeAcceder, modulosDe };
