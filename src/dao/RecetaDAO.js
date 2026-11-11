const { BaseDAO } = require('./db');

const SELECT_RECETA = `
  SELECT r.*, m.nombre AS mascota_nombre, m.especie AS mascota_especie, m.raza AS mascota_raza,
         p.id AS propietario_id, p.nombre AS propietario_nombre, p.documento AS propietario_documento,
         p.correo AS propietario_correo, p.telefono AS propietario_telefono,
         u.nombre AS veterinario_nombre, u.correo AS veterinario_correo
  FROM recetas r
  JOIN mascotas m ON m.id = r.mascota_id
  JOIN propietarios p ON p.id = m.propietario_id
  JOIN usuarios u ON u.id = r.veterinario_id`;

/**
 * DAO de Recetas médicas digitales (HU-06) y sus medicamentos.
 */
class RecetaDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT UNIQUE,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        observaciones TEXT,
        canal_envio TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE TABLE IF NOT EXISTS receta_medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER NOT NULL REFERENCES recetas(id),
        medicamento TEXT NOT NULL,
        dosis TEXT NOT NULL,
        frecuencia TEXT NOT NULL,
        duracion TEXT NOT NULL
      );
    `);
  }

  /**
   * Contrato: Guarda una receta con sus medicamentos y le asigna un número consecutivo.
   * @param {{mascotaId: number, veterinarioId: number, observaciones?: string, canalEnvio: string,
   *          medicamentos: Array<{medicamento: string, dosis: string, frecuencia: string, duracion: string}>}} datos
   * @returns {Object} Receta completa.
   */
  guardar({ mascotaId, veterinarioId, observaciones, canalEnvio, medicamentos }) {
    const { id } = this.ejecutar(
      'INSERT INTO recetas (mascota_id, veterinario_id, observaciones, canal_envio) VALUES (?, ?, ?, ?)',
      mascotaId, veterinarioId, observaciones || null, canalEnvio
    );
    this.ejecutar('UPDATE recetas SET numero = ? WHERE id = ?', `RX-${String(id).padStart(5, '0')}`, id);
    for (const m of medicamentos) {
      this.ejecutar('INSERT INTO receta_medicamentos (receta_id, medicamento, dosis, frecuencia, duracion) VALUES (?, ?, ?, ?, ?)',
        id, m.medicamento, m.dosis, m.frecuencia, m.duracion);
    }
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Busca una receta con sus medicamentos.
   * @param {number} id - Receta.
   * @returns {Object|null} Receta.
   */
  buscarPorId(id) {
    const fila = this.uno(`${SELECT_RECETA} WHERE r.id = ?`, id);
    return fila ? this.completar(fila) : null;
  }

  /**
   * Contrato: Lista recetas, opcionalmente de una mascota o de un propietario.
   * @param {{mascotaId?: number, propietarioId?: number}} filtros
   * @returns {Array<Object>} Recetas, de la más reciente a la más antigua.
   */
  listar({ mascotaId = null, propietarioId = null } = {}) {
    return this.todos(`${SELECT_RECETA}
      WHERE (? IS NULL OR r.mascota_id = ?) AND (? IS NULL OR p.id = ?)
      ORDER BY r.creado_en DESC, r.id DESC`, mascotaId, mascotaId, propietarioId, propietarioId)
      .map((f) => this.completar(f));
  }

  completar(fila) {
    return {
      ...fila,
      medicamentos: this.todos('SELECT medicamento, dosis, frecuencia, duracion FROM receta_medicamentos WHERE receta_id = ? ORDER BY id', fila.id)
    };
  }
}

module.exports = RecetaDAO;
