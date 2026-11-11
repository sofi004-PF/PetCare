const { BaseDAO } = require('./db');
const Consulta = require('../models/Consulta');

const SELECT_CONSULTA = `
  SELECT c.*, m.nombre AS mascota_nombre, p.nombre AS propietario_nombre, u.nombre AS veterinario_nombre
  FROM consultas c
  JOIN mascotas m ON m.id = c.mascota_id
  JOIN propietarios p ON p.id = m.propietario_id
  JOIN usuarios u ON u.id = c.veterinario_id`;

/**
 * DAO de Consultas veterinarias (HU-08).
 */
class ConsultaDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consultas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        cita_id INTEGER REFERENCES citas(id),
        fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        motivo TEXT NOT NULL,
        sintomas TEXT NOT NULL,
        diagnostico TEXT NOT NULL,
        observaciones TEXT,
        peso_kg REAL,
        temperatura_c REAL
      );
    `);
  }

  /**
   * Contrato: Inserta una consulta. La fecha y hora las asigna la base de datos.
   * @param {Object} datos - mascotaId, veterinarioId, citaId, motivo, sintomas, diagnostico, observaciones, pesoKg, temperaturaC.
   * @returns {Consulta} Consulta guardada.
   */
  guardar({ mascotaId, veterinarioId, citaId, motivo, sintomas, diagnostico, observaciones, pesoKg, temperaturaC }) {
    const { id } = this.ejecutar(
      `INSERT INTO consultas (mascota_id, veterinario_id, cita_id, motivo, sintomas, diagnostico, observaciones, peso_kg, temperatura_c)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      mascotaId, veterinarioId, citaId, motivo, sintomas, diagnostico, observaciones, pesoKg, temperaturaC
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Busca una consulta por id.
   * @param {number} id - Consulta.
   * @returns {Consulta|null} Consulta.
   */
  buscarPorId(id) {
    const fila = this.uno(`${SELECT_CONSULTA} WHERE c.id = ?`, id);
    return fila ? new Consulta(fila) : null;
  }

  /**
   * Contrato: Lista consultas con filtros opcionales, de la más reciente a la más antigua.
   * @param {{mascotaId?: number, veterinarioId?: number, fecha?: string}} filtros
   * @returns {Array<Consulta>} Consultas.
   */
  listar({ mascotaId = null, veterinarioId = null, fecha = null } = {}) {
    return this.todos(`${SELECT_CONSULTA}
      WHERE (? IS NULL OR c.mascota_id = ?) AND (? IS NULL OR c.veterinario_id = ?) AND (? IS NULL OR date(c.fecha) = ?)
      ORDER BY c.fecha DESC, c.id DESC`,
    mascotaId, mascotaId, veterinarioId, veterinarioId, fecha, fecha).map((f) => new Consulta(f));
  }

  /** @returns {number} Cantidad de consultas registradas. */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM consultas').total;
  }
}

module.exports = ConsultaDAO;
