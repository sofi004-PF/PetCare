const { BaseDAO } = require('./db');

/**
 * DAO del Historial clínico (HU-02): entradas clínicas (notas, vacunas,
 * desparasitaciones, procedimientos) y archivos adjuntos de cada mascota.
 * La fecha, hora y el veterinario de cada registro se guardan automáticamente.
 */
class HistorialDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS historial_entradas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE TABLE IF NOT EXISTS historial_archivos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo_mime TEXT NOT NULL,
        tamano INTEGER NOT NULL,
        ruta TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Guarda una entrada clínica.
   * @param {{mascotaId: number, veterinarioId: number, tipo: string, titulo: string, descripcion?: string}} datos
   * @returns {Object} Entrada con fecha y nombre del veterinario.
   */
  guardarEntrada({ mascotaId, veterinarioId, tipo, titulo, descripcion }) {
    const { id } = this.ejecutar(
      'INSERT INTO historial_entradas (mascota_id, veterinario_id, tipo, titulo, descripcion) VALUES (?, ?, ?, ?, ?)',
      mascotaId, veterinarioId, tipo, titulo, descripcion || null
    );
    return this.uno(`SELECT e.*, u.nombre AS veterinario_nombre FROM historial_entradas e
      JOIN usuarios u ON u.id = e.veterinario_id WHERE e.id = ?`, id);
  }

  /**
   * Contrato: Lista las entradas clínicas de una mascota.
   * @param {number} mascotaId - Mascota.
   * @returns {Array<Object>} Entradas con el nombre del veterinario.
   */
  listarEntradas(mascotaId) {
    return this.todos(`SELECT e.*, u.nombre AS veterinario_nombre FROM historial_entradas e
      JOIN usuarios u ON u.id = e.veterinario_id WHERE e.mascota_id = ? ORDER BY e.creado_en DESC, e.id DESC`, mascotaId);
  }

  /**
   * Contrato: Registra los datos de un archivo adjunto.
   * @param {{mascotaId: number, veterinarioId: number, nombre: string, descripcion?: string, tipoMime: string, tamano: number, ruta: string}} datos
   * @returns {Object} Archivo registrado.
   */
  guardarArchivo({ mascotaId, veterinarioId, nombre, descripcion, tipoMime, tamano, ruta }) {
    const { id } = this.ejecutar(
      'INSERT INTO historial_archivos (mascota_id, veterinario_id, nombre, descripcion, tipo_mime, tamano, ruta) VALUES (?, ?, ?, ?, ?, ?, ?)',
      mascotaId, veterinarioId, nombre, descripcion || null, tipoMime, tamano, ruta
    );
    return this.buscarArchivo(id);
  }

  /**
   * Contrato: Busca un archivo adjunto.
   * @param {number} id - Archivo.
   * @returns {Object|null} Archivo con el nombre del veterinario.
   */
  buscarArchivo(id) {
    return this.uno(`SELECT a.*, u.nombre AS veterinario_nombre FROM historial_archivos a
      JOIN usuarios u ON u.id = a.veterinario_id WHERE a.id = ?`, id);
  }

  /**
   * Contrato: Lista los archivos adjuntos de una mascota.
   * @param {number} mascotaId - Mascota.
   * @returns {Array<Object>} Archivos.
   */
  listarArchivos(mascotaId) {
    return this.todos(`SELECT a.*, u.nombre AS veterinario_nombre FROM historial_archivos a
      JOIN usuarios u ON u.id = a.veterinario_id WHERE a.mascota_id = ? ORDER BY a.creado_en DESC, a.id DESC`, mascotaId);
  }

  /** @returns {number} Cantidad de entradas clínicas. */
  contarEntradas() {
    return this.uno('SELECT COUNT(*) AS total FROM historial_entradas').total;
  }
}

module.exports = HistorialDAO;
