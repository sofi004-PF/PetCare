const { BaseDAO } = require('./db');

/**
 * DAO de Notificaciones: registro de los mensajes enviados a los clientes
 * (correo, SMS o WhatsApp) con su fecha, canal y estado (RF-13).
 */
class NotificacionDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        propietario_id INTEGER REFERENCES propietarios(id),
        destinatario TEXT NOT NULL,
        canal TEXT NOT NULL,
        tipo TEXT NOT NULL,
        asunto TEXT NOT NULL,
        cuerpo TEXT NOT NULL,
        enlace TEXT,
        estado TEXT NOT NULL DEFAULT 'Enviado',
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Registra un mensaje enviado.
   * @param {{propietarioId?: number, destinatario: string, canal: string, tipo: string, asunto: string, cuerpo: string, enlace?: string}} datos
   * @returns {Object} Notificación guardada.
   */
  guardar({ propietarioId = null, destinatario, canal, tipo, asunto, cuerpo, enlace = null }) {
    const { id } = this.ejecutar(
      'INSERT INTO notificaciones (propietario_id, destinatario, canal, tipo, asunto, cuerpo, enlace) VALUES (?, ?, ?, ?, ?, ?, ?)',
      propietarioId, destinatario, canal, tipo, asunto, cuerpo, enlace
    );
    return this.uno('SELECT * FROM notificaciones WHERE id = ?', id);
  }

  /**
   * Contrato: Lista las notificaciones, de la más reciente a la más antigua.
   * @param {{propietarioId?: number, tipo?: string}} [filtros] - Filtros opcionales.
   * @returns {Array<Object>} Notificaciones.
   */
  listar({ propietarioId = null, tipo = null } = {}) {
    return this.todos(`
      SELECT n.*, p.nombre AS propietario_nombre FROM notificaciones n
      LEFT JOIN propietarios p ON p.id = n.propietario_id
      WHERE (? IS NULL OR n.propietario_id = ?) AND (? IS NULL OR n.tipo = ?)
      ORDER BY n.id DESC`, propietarioId, propietarioId, tipo, tipo);
  }

  /**
   * Contrato: Indica si ya se envió una notificación de un tipo con un enlace dado.
   * @param {string} tipo - Tipo de notificación.
   * @param {string} enlace - Enlace o referencia única.
   * @returns {boolean} true si ya existe.
   */
  existe(tipo, enlace) {
    return Boolean(this.uno('SELECT id FROM notificaciones WHERE tipo = ? AND enlace = ?', tipo, enlace));
  }
}

module.exports = NotificacionDAO;
