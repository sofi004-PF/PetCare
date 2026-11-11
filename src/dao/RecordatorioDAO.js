const { BaseDAO } = require('./db');

const SELECT_RECORDATORIO = `
  SELECT r.*, m.nombre AS mascota_nombre, p.id AS propietario_id, p.nombre AS propietario_nombre,
         u.nombre AS veterinario_nombre
  FROM recordatorios r
  JOIN mascotas m ON m.id = r.mascota_id
  JOIN propietarios p ON p.id = m.propietario_id
  JOIN usuarios u ON u.id = r.creado_por`;

/**
 * DAO de Recordatorios de vacunación y desparasitación (HU-03).
 */
class RecordatorioDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recordatorios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        fecha_programada TEXT NOT NULL,
        canal TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Pendiente',
        token TEXT NOT NULL UNIQUE,
        enviado_en TEXT,
        respondido_en TEXT,
        creado_por INTEGER NOT NULL REFERENCES usuarios(id),
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Guarda un recordatorio pendiente.
   * @param {Object} datos - mascotaId, tipo, descripcion, fechaProgramada, canal, token, creadoPor.
   * @returns {Object} Recordatorio.
   */
  guardar({ mascotaId, tipo, descripcion, fechaProgramada, canal, token, creadoPor }) {
    const { id } = this.ejecutar(
      'INSERT INTO recordatorios (mascota_id, tipo, descripcion, fecha_programada, canal, token, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      mascotaId, tipo, descripcion, fechaProgramada, canal, token, creadoPor
    );
    return this.buscarPorId(id);
  }

  /** @param {number} id @returns {Object|null} Recordatorio. */
  buscarPorId(id) {
    return this.uno(`${SELECT_RECORDATORIO} WHERE r.id = ?`, id);
  }

  /** @param {string} token @returns {Object|null} Recordatorio. */
  buscarPorToken(token) {
    return this.uno(`${SELECT_RECORDATORIO} WHERE r.token = ?`, token);
  }

  /**
   * Contrato: Lista recordatorios con filtros opcionales, por fecha programada.
   * @param {{mascotaId?: number, propietarioId?: number, estado?: string}} filtros
   * @returns {Array<Object>} Recordatorios.
   */
  listar({ mascotaId = null, propietarioId = null, estado = null } = {}) {
    return this.todos(`${SELECT_RECORDATORIO}
      WHERE (? IS NULL OR r.mascota_id = ?) AND (? IS NULL OR p.id = ?) AND (? IS NULL OR r.estado = ?)
      ORDER BY r.fecha_programada, r.id`, mascotaId, mascotaId, propietarioId, propietarioId, estado, estado);
  }

  /**
   * Contrato: Recordatorios pendientes que ya deben enviarse (fecha programada dentro del plazo de aviso).
   * @param {string} hoy - Fecha actual AAAA-MM-DD.
   * @param {string} limite - Fecha límite (hoy + días de anticipación).
   * @returns {Array<Object>} Recordatorios por enviar.
   */
  porEnviar(hoy, limite) {
    return this.todos(`${SELECT_RECORDATORIO}
      WHERE r.estado = 'Pendiente' AND r.enviado_en IS NULL AND r.fecha_programada BETWEEN ? AND ?`, hoy, limite);
  }

  /** @param {number} id - Recordatorio enviado. */
  marcarEnviado(id) {
    this.ejecutar("UPDATE recordatorios SET enviado_en = datetime('now', 'localtime') WHERE id = ?", id);
  }

  /**
   * @param {number} id - Recordatorio.
   * @param {string} estado - Confirmado o Cancelado.
   */
  responder(id, estado) {
    this.ejecutar("UPDATE recordatorios SET estado = ?, respondido_en = datetime('now', 'localtime') WHERE id = ?", estado, id);
  }

  /** @returns {number} Cantidad de recordatorios. */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM recordatorios').total;
  }
}

module.exports = RecordatorioDAO;
