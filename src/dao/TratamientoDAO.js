const { BaseDAO } = require('./db');
const Tratamiento = require('../models/Tratamiento');

const SELECT_TRATAMIENTO = `
  SELECT t.*, m.nombre AS mascota_nombre, u.nombre AS veterinario_nombre
  FROM tratamientos t
  JOIN mascotas m ON m.id = t.mascota_id
  JOIN usuarios u ON u.id = t.veterinario_id`;

/**
 * DAO de Tratamientos y su evolución (HU-09).
 */
class TratamientoDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        medicamento TEXT NOT NULL,
        dosis TEXT NOT NULL,
        frecuencia TEXT NOT NULL,
        duracion TEXT NOT NULL,
        indicaciones TEXT,
        estado TEXT NOT NULL DEFAULT 'Activo',
        fecha_inicio TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        fecha_fin TEXT
      );
      CREATE TABLE IF NOT EXISTS tratamiento_evoluciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tratamiento_id INTEGER NOT NULL REFERENCES tratamientos(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        nota TEXT NOT NULL,
        finaliza INTEGER NOT NULL DEFAULT 0,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Inserta un tratamiento activo.
   * @param {Object} datos - mascotaId, veterinarioId, medicamento, dosis, frecuencia, duracion, indicaciones.
   * @returns {Tratamiento} Tratamiento guardado.
   */
  guardar({ mascotaId, veterinarioId, medicamento, dosis, frecuencia, duracion, indicaciones }) {
    const { id } = this.ejecutar(
      'INSERT INTO tratamientos (mascota_id, veterinario_id, medicamento, dosis, frecuencia, duracion, indicaciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
      mascotaId, veterinarioId, medicamento, dosis, frecuencia, duracion, indicaciones
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Busca un tratamiento con su evolución.
   * @param {number} id - Tratamiento.
   * @returns {Tratamiento|null} Tratamiento.
   */
  buscarPorId(id) {
    const fila = this.uno(`${SELECT_TRATAMIENTO} WHERE t.id = ?`, id);
    return fila ? new Tratamiento(fila, this.evoluciones(id)) : null;
  }

  /**
   * Contrato: Lista tratamientos con filtros opcionales (activos primero, luego los más recientes).
   * @param {{mascotaId?: number, estado?: string}} filtros
   * @returns {Array<Tratamiento>} Tratamientos con su evolución.
   */
  listar({ mascotaId = null, estado = null } = {}) {
    return this.todos(`${SELECT_TRATAMIENTO}
      WHERE (? IS NULL OR t.mascota_id = ?) AND (? IS NULL OR t.estado = ?)
      ORDER BY CASE t.estado WHEN 'Activo' THEN 0 ELSE 1 END, t.fecha_inicio DESC, t.id DESC`,
    mascotaId, mascotaId, estado, estado).map((f) => new Tratamiento(f, this.evoluciones(f.id)));
  }

  /**
   * Contrato: Registra una observación de evolución.
   * @param {{tratamientoId: number, veterinarioId: number, nota: string, finaliza: boolean}} datos
   */
  guardarEvolucion({ tratamientoId, veterinarioId, nota, finaliza }) {
    this.ejecutar('INSERT INTO tratamiento_evoluciones (tratamiento_id, veterinario_id, nota, finaliza) VALUES (?, ?, ?, ?)',
      tratamientoId, veterinarioId, nota, finaliza);
  }

  /**
   * Contrato: Marca un tratamiento como finalizado con la fecha actual.
   * @param {number} id - Tratamiento.
   */
  finalizar(id) {
    this.ejecutar("UPDATE tratamientos SET estado = 'Finalizado', fecha_fin = datetime('now', 'localtime') WHERE id = ?", id);
  }

  /**
   * @param {number} tratamientoId - Tratamiento.
   * @returns {Array<Object>} Evoluciones en orden cronológico.
   */
  evoluciones(tratamientoId) {
    return this.todos(`SELECT e.*, u.nombre AS veterinario_nombre FROM tratamiento_evoluciones e
      JOIN usuarios u ON u.id = e.veterinario_id WHERE e.tratamiento_id = ? ORDER BY e.creado_en, e.id`, tratamientoId);
  }

  /** @returns {number} Cantidad de tratamientos. */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM tratamientos').total;
  }
}

module.exports = TratamientoDAO;
