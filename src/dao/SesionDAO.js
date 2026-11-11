const { BaseDAO } = require('./db');

/**
 * DAO de Sesiones (HU-11): guarda los tokens de inicio de sesión.
 */
class SesionDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sesiones (
        token TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        expira_en INTEGER NOT NULL
      );
    `);
  }

  /**
   * Contrato: Registra una sesión nueva.
   * @param {string} token - Token aleatorio.
   * @param {number} usuarioId - Usuario dueño de la sesión.
   * @param {number} expiraEn - Fecha de expiración en milisegundos.
   */
  guardar(token, usuarioId, expiraEn) {
    this.ejecutar('INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?, ?, ?)', token, usuarioId, expiraEn);
  }

  /**
   * Contrato: Retorna el id del usuario de una sesión vigente.
   * @param {string} token - Token de la cookie.
   * @returns {number|null} Id del usuario o null si la sesión no existe o expiró.
   */
  usuarioDeToken(token) {
    const fila = this.uno('SELECT usuario_id FROM sesiones WHERE token = ? AND expira_en > ?', token, Date.now());
    return fila ? fila.usuario_id : null;
  }

  /**
   * Contrato: Elimina una sesión (cierre de sesión).
   * @param {string} token - Token a eliminar.
   */
  eliminar(token) {
    this.ejecutar('DELETE FROM sesiones WHERE token = ?', token);
  }

  /**
   * Contrato: Elimina todas las sesiones de un usuario (ej: al desactivarlo).
   * @param {number} usuarioId - Usuario.
   */
  eliminarDeUsuario(usuarioId) {
    this.ejecutar('DELETE FROM sesiones WHERE usuario_id = ?', usuarioId);
  }
}

module.exports = SesionDAO;
