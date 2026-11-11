const { BaseDAO } = require('./db');
const Usuario = require('../models/Usuario');

/**
 * DAO de Usuarios (HU-11): persistencia de cuentas y contraseñas cifradas.
 */
class UsuarioDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        propietario_id INTEGER,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Retorna todos los usuarios ordenados por nombre.
   * @returns {Array<Usuario>} Usuarios registrados.
   */
  obtenerTodos() {
    return this.todos('SELECT * FROM usuarios ORDER BY nombre').map((f) => new Usuario(f));
  }

  /**
   * Contrato: Busca un usuario por id.
   * @param {number} id - Identificador.
   * @returns {Usuario|null} Usuario o null.
   */
  buscarPorId(id) {
    const fila = this.uno('SELECT * FROM usuarios WHERE id = ?', id);
    return fila ? new Usuario(fila) : null;
  }

  /**
   * Contrato: Busca un usuario por correo, incluyendo su hash de contraseña.
   * @param {string} correo - Correo de acceso.
   * @returns {{usuario: Usuario, passwordHash: string}|null} Usuario y hash, o null.
   */
  buscarCredenciales(correo) {
    const fila = this.uno('SELECT * FROM usuarios WHERE correo = ?', correo);
    return fila ? { usuario: new Usuario(fila), passwordHash: fila.password_hash } : null;
  }

  /**
   * Contrato: Lista los usuarios activos de un rol (ej: veterinarios).
   * @param {string} rol - Rol a filtrar.
   * @returns {Array<Usuario>} Usuarios activos del rol.
   */
  obtenerPorRol(rol) {
    return this.todos('SELECT * FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY nombre', rol).map((f) => new Usuario(f));
  }

  /**
   * Contrato: Inserta un usuario nuevo.
   * @param {{nombre: string, correo: string, passwordHash: string, rol: string, propietarioId?: number}} datos
   * @returns {Usuario} Usuario creado.
   */
  guardar({ nombre, correo, passwordHash, rol, propietarioId = null }) {
    const { id } = this.ejecutar(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol, propietario_id) VALUES (?, ?, ?, ?, ?)',
      nombre, correo, passwordHash, rol, propietarioId
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Actualiza nombre, correo, rol y opcionalmente la contraseña.
   * @param {number} id - Usuario a modificar.
   * @param {{nombre: string, correo: string, rol: string, passwordHash?: string}} datos
   * @returns {Usuario|null} Usuario actualizado o null si no existe.
   */
  actualizar(id, { nombre, correo, rol, passwordHash }) {
    this.ejecutar('UPDATE usuarios SET nombre = ?, correo = ?, rol = ? WHERE id = ?', nombre, correo, rol, id);
    if (passwordHash) {
      this.ejecutar('UPDATE usuarios SET password_hash = ? WHERE id = ?', passwordHash, id);
    }
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Activa o desactiva un usuario.
   * @param {number} id - Usuario.
   * @param {boolean} activo - Nuevo estado.
   * @returns {Usuario|null} Usuario actualizado.
   */
  cambiarEstado(id, activo) {
    this.ejecutar('UPDATE usuarios SET activo = ? WHERE id = ?', activo, id);
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Cantidad total de usuarios (para saber si hay que sembrar datos).
   * @returns {number} Total.
   */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM usuarios').total;
  }
}

module.exports = UsuarioDAO;
