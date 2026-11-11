const crypto = require('crypto');
const UsuarioDAO = require('../dao/UsuarioDAO');
const SesionDAO = require('../dao/SesionDAO');
const { ROLES, modulosDe } = require('../config/permisos');
const { exigir, exigirCampos, PATRON_CORREO } = require('../utils/errores');

const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas
const LONGITUD_MINIMA_PASSWORD = 8;

/**
 * Contrato: Cifra una contraseña con scrypt y una sal aleatoria.
 * @param {string} password - Contraseña en texto plano.
 * @returns {string} "sal:hash" en hexadecimal.
 */
function cifrarPassword(password) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

/**
 * Contrato: Compara una contraseña con su hash sin filtrar tiempos.
 * @param {string} password - Contraseña ingresada.
 * @param {string} almacenado - Valor "sal:hash" guardado.
 * @returns {boolean} true si coinciden.
 */
function verificarPassword(password, almacenado) {
  const [sal, hash] = String(almacenado).split(':');
  if (!sal || !hash) return false;
  const calculado = crypto.scryptSync(password, sal, 64);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

/**
 * Controlador fachada (Facade) para la gestión de usuarios, roles y
 * sesiones (HU-11). Concentra las reglas de negocio de acceso al sistema.
 */
class UsuarioController {
  constructor() {
    this.usuarioDAO = new UsuarioDAO();
    this.sesionDAO = new SesionDAO();
  }

  /**
   * Contrato: Inicia sesión con correo y contraseña.
   * @param {string} correo - Correo de acceso.
   * @param {string} password - Contraseña.
   * @returns {{token: string, usuario: Object, modulos: Array<string>}} Sesión creada.
   * @throws {ErrorNegocio} 401 si las credenciales no son válidas o el usuario está inactivo.
   */
  iniciarSesion(correo, password) {
    exigirCampos({ correo, password }, { correo: 'correo', password: 'contraseña' });
    const credenciales = this.usuarioDAO.buscarCredenciales(String(correo).trim());
    exigir(credenciales && verificarPassword(password, credenciales.passwordHash), 'Correo o contraseña incorrectos', 401);
    exigir(credenciales.usuario.activo, 'El usuario está desactivado. Contacte al administrador.', 401);

    const token = crypto.randomBytes(32).toString('hex');
    this.sesionDAO.guardar(token, credenciales.usuario.id, Date.now() + DURACION_SESION_MS);
    return { token, ...this.datosSesion(credenciales.usuario) };
  }

  /**
   * Contrato: Cierra la sesión asociada a un token.
   * @param {string} token - Token de la cookie.
   */
  cerrarSesion(token) {
    if (token) this.sesionDAO.eliminar(token);
  }

  /**
   * Contrato: Obtiene el usuario activo de una sesión vigente.
   * @param {string} token - Token de la cookie.
   * @returns {Usuario|null} Usuario autenticado o null.
   */
  usuarioDeSesion(token) {
    const usuarioId = this.sesionDAO.usuarioDeToken(token);
    if (!usuarioId) return null;
    const usuario = this.usuarioDAO.buscarPorId(usuarioId);
    return usuario && usuario.activo ? usuario : null;
  }

  /**
   * Contrato: Datos que la página necesita del usuario autenticado.
   * @param {Usuario} usuario - Usuario autenticado.
   * @returns {{usuario: Object, modulos: Array<string>}} Usuario público y módulos permitidos.
   */
  datosSesion(usuario) {
    return { usuario: usuario.aPublico(), modulos: modulosDe(usuario.rol) };
  }

  /**
   * Contrato: Lista los usuarios del sistema.
   * @returns {Array<Object>} Usuarios sin contraseñas.
   */
  listarUsuarios() {
    return this.usuarioDAO.obtenerTodos().map((u) => u.aPublico());
  }

  /**
   * Contrato: Lista los veterinarios activos.
   * @returns {Array<Object>} Veterinarios.
   */
  listarVeterinarios() {
    return this.usuarioDAO.obtenerPorRol('veterinario').map((u) => u.aPublico());
  }

  /**
   * Contrato: Crea un usuario con un rol válido.
   * @param {{nombre: string, correo: string, password: string, rol: string, propietarioId?: number}} datos
   * @returns {Object} Usuario creado (sin contraseña).
   * @throws {ErrorNegocio} Si faltan datos, el rol no existe, el correo es inválido o ya está registrado.
   */
  crearUsuario({ nombre, correo, password, rol, propietarioId = null }) {
    exigirCampos({ nombre, correo, password, rol }, { nombre: 'nombre', correo: 'correo', password: 'contraseña', rol: 'rol' });
    this.validarDatos({ correo, rol, password });
    exigir(!this.usuarioDAO.buscarCredenciales(correo.trim()), `Ya existe un usuario con el correo ${correo}`, 409);
    return this.usuarioDAO.guardar({
      nombre: nombre.trim(),
      correo: correo.trim(),
      passwordHash: cifrarPassword(password),
      rol,
      propietarioId
    }).aPublico();
  }

  /**
   * Contrato: Modifica los datos y el rol de un usuario.
   * @param {number} id - Usuario a modificar.
   * @param {{nombre: string, correo: string, rol: string, password?: string}} datos - La contraseña es opcional.
   * @param {number} actorId - Usuario que realiza el cambio.
   * @returns {Object} Usuario actualizado.
   * @throws {ErrorNegocio} Si el usuario no existe, los datos son inválidos o el administrador intenta quitarse su propio rol.
   */
  actualizarUsuario(id, { nombre, correo, rol, password }, actorId) {
    const actual = this.obtenerExistente(id);
    exigirCampos({ nombre, correo, rol }, { nombre: 'nombre', correo: 'correo', rol: 'rol' });
    this.validarDatos({ correo, rol, password });
    const otro = this.usuarioDAO.buscarCredenciales(correo.trim());
    exigir(!otro || otro.usuario.id === actual.id, `Ya existe un usuario con el correo ${correo}`, 409);
    exigir(!(actual.id === actorId && rol !== actual.rol), 'No puede cambiar su propio rol');
    return this.usuarioDAO.actualizar(actual.id, {
      nombre: nombre.trim(),
      correo: correo.trim(),
      rol,
      passwordHash: password ? cifrarPassword(password) : null
    }).aPublico();
  }

  /**
   * Contrato: Activa o desactiva un usuario. Al desactivarlo se cierran sus sesiones.
   * @param {number} id - Usuario a modificar.
   * @param {boolean} activo - Nuevo estado.
   * @param {number} actorId - Usuario que realiza el cambio.
   * @returns {Object} Usuario actualizado.
   * @throws {ErrorNegocio} Si el usuario no existe o intenta desactivarse a sí mismo.
   */
  cambiarEstado(id, activo, actorId) {
    const usuario = this.obtenerExistente(id);
    exigir(!(usuario.id === actorId && !activo), 'No puede desactivar su propio usuario');
    if (!activo) this.sesionDAO.eliminarDeUsuario(usuario.id);
    return this.usuarioDAO.cambiarEstado(usuario.id, Boolean(activo)).aPublico();
  }

  /**
   * Contrato: Lista los roles disponibles.
   * @returns {Array<{id: string, nombre: string}>} Roles.
   */
  listarRoles() {
    return Object.entries(ROLES).map(([id, nombre]) => ({ id, nombre }));
  }

  /**
   * Valida formato de correo, rol existente y longitud de contraseña.
   * @param {{correo: string, rol: string, password?: string}} datos
   * @throws {ErrorNegocio} Si algún dato no es válido.
   */
  validarDatos({ correo, rol, password }) {
    exigir(PATRON_CORREO.test(String(correo).trim()), 'El correo no tiene un formato válido');
    exigir(Object.prototype.hasOwnProperty.call(ROLES, rol), `El rol "${rol}" no existe`);
    if (password) {
      exigir(String(password).length >= LONGITUD_MINIMA_PASSWORD, `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`);
    }
  }

  /**
   * @param {number} id - Usuario.
   * @returns {Usuario} Usuario existente.
   * @throws {ErrorNegocio} 404 si no existe.
   */
  obtenerExistente(id) {
    const usuario = this.usuarioDAO.buscarPorId(Number(id));
    exigir(usuario, 'El usuario no existe', 404);
    return usuario;
  }

  /**
   * Contrato: Crea los usuarios de prueba si la base de datos está vacía.
   * @param {string} passwordInicial - Contraseña de los usuarios de prueba.
   */
  sembrar(passwordInicial) {
    if (this.usuarioDAO.contar() > 0) return;
    this.crearUsuario({ nombre: 'Administrador PetCare', correo: 'admin@petcare.com', password: passwordInicial, rol: 'administrador' });
    this.crearUsuario({ nombre: 'Dra. Valentina Ruiz', correo: 'veterinario@petcare.com', password: passwordInicial, rol: 'veterinario' });
    this.crearUsuario({ nombre: 'Dr. Andrés Muñoz', correo: 'veterinario2@petcare.com', password: passwordInicial, rol: 'veterinario' });
    this.crearUsuario({ nombre: 'Camila Ortega', correo: 'recepcion@petcare.com', password: passwordInicial, rol: 'recepcionista' });
  }
}

module.exports = UsuarioController;
