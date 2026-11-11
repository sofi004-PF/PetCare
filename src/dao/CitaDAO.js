const { BaseDAO } = require('./db');
const Cita = require('../models/Cita');

const SELECT_CITA = `
  SELECT c.*, m.nombre AS mascota_nombre, p.id AS propietario_id, p.nombre AS propietario_nombre,
         u.nombre AS veterinario_nombre, s.nombre AS servicio_nombre
  FROM citas c
  JOIN mascotas m ON m.id = c.mascota_id
  JOIN propietarios p ON p.id = m.propietario_id
  JOIN usuarios u ON u.id = c.veterinario_id
  JOIN servicios s ON s.id = c.servicio_id`;

/**
 * DAO de Citas y Servicios (HU-01).
 * El índice único parcial impide, a nivel de base de datos, dos citas activas
 * con el mismo veterinario en la misma fecha y hora.
 */
class CitaDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        precio INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id),
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id),
        servicio_id INTEGER NOT NULL REFERENCES servicios(id),
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        motivo TEXT,
        costo INTEGER NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Programada',
        creado_por INTEGER REFERENCES usuarios(id),
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_cita_veterinario_horario
        ON citas (veterinario_id, fecha, hora) WHERE estado <> 'Cancelada';
    `);
  }

  /**
   * Contrato: Lista los servicios ofrecidos.
   * @returns {Array<Object>} Servicios con precio.
   */
  listarServicios() {
    return this.todos('SELECT * FROM servicios ORDER BY id');
  }

  /**
   * Contrato: Busca un servicio.
   * @param {number} id - Servicio.
   * @returns {Object|null} Servicio.
   */
  buscarServicio(id) {
    return this.uno('SELECT * FROM servicios WHERE id = ?', id);
  }

  /**
   * Contrato: Inserta un servicio.
   * @param {{nombre: string, descripcion: string, precio: number}} datos
   */
  guardarServicio({ nombre, descripcion, precio }) {
    this.ejecutar('INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)', nombre, descripcion, precio);
  }

  /**
   * Contrato: Inserta una cita.
   * @param {Object} datos - codigo, mascotaId, veterinarioId, servicioId, fecha, hora, motivo, costo, creadoPor.
   * @returns {Cita} Cita guardada.
   */
  guardar({ codigo, mascotaId, veterinarioId, servicioId, fecha, hora, motivo, costo, creadoPor }) {
    const { id } = this.ejecutar(
      'INSERT INTO citas (codigo, mascota_id, veterinario_id, servicio_id, fecha, hora, motivo, costo, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      codigo, mascotaId, veterinarioId, servicioId, fecha, hora, motivo || null, costo, creadoPor
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Busca una cita por id.
   * @param {number} id - Cita.
   * @returns {Cita|null} Cita.
   */
  buscarPorId(id) {
    const fila = this.uno(`${SELECT_CITA} WHERE c.id = ?`, id);
    return fila ? new Cita(fila) : null;
  }

  /**
   * Contrato: Lista citas con filtros opcionales.
   * @param {{fecha?: string, desde?: string, veterinarioId?: number, propietarioId?: number, mascotaId?: number, estado?: string}} filtros
   * @returns {Array<Cita>} Citas ordenadas por fecha y hora.
   */
  listar({ fecha = null, desde = null, veterinarioId = null, propietarioId = null, mascotaId = null, estado = null } = {}) {
    return this.todos(`${SELECT_CITA}
      WHERE (? IS NULL OR c.fecha = ?) AND (? IS NULL OR c.fecha >= ?)
        AND (? IS NULL OR c.veterinario_id = ?) AND (? IS NULL OR p.id = ?)
        AND (? IS NULL OR c.mascota_id = ?) AND (? IS NULL OR c.estado = ?)
      ORDER BY c.fecha, c.hora`,
    fecha, fecha, desde, desde, veterinarioId, veterinarioId, propietarioId, propietarioId, mascotaId, mascotaId, estado, estado
    ).map((f) => new Cita(f));
  }

  /**
   * Contrato: Horas ocupadas de un veterinario entre dos fechas (citas no canceladas).
   * @param {number} veterinarioId - Veterinario.
   * @param {string} desde - Fecha inicial AAAA-MM-DD.
   * @param {string} hasta - Fecha final AAAA-MM-DD.
   * @returns {Array<{fecha: string, hora: string}>} Horarios ocupados.
   */
  horariosOcupados(veterinarioId, desde, hasta) {
    return this.todos(
      "SELECT fecha, hora FROM citas WHERE veterinario_id = ? AND fecha BETWEEN ? AND ? AND estado <> 'Cancelada'",
      veterinarioId, desde, hasta
    );
  }

  /**
   * Contrato: Indica si un veterinario ya tiene una cita activa en un horario.
   * @param {number} veterinarioId - Veterinario.
   * @param {string} fecha - Fecha.
   * @param {string} hora - Hora.
   * @param {number} [excluirId] - Cita a ignorar (al reprogramar).
   * @returns {boolean} true si está ocupado.
   */
  estaOcupado(veterinarioId, fecha, hora, excluirId = null) {
    return Boolean(this.uno(
      "SELECT id FROM citas WHERE veterinario_id = ? AND fecha = ? AND hora = ? AND estado <> 'Cancelada' AND (? IS NULL OR id <> ?)",
      veterinarioId, fecha, hora, excluirId, excluirId
    ));
  }

  /**
   * Contrato: Cambia el estado de una cita.
   * @param {number} id - Cita.
   * @param {string} estado - Nuevo estado.
   * @returns {Cita} Cita actualizada.
   */
  cambiarEstado(id, estado) {
    this.ejecutar('UPDATE citas SET estado = ? WHERE id = ?', estado, id);
    return this.buscarPorId(id);
  }

  /**
   * Contrato: Cambia fecha, hora y veterinario de una cita.
   * @param {number} id - Cita.
   * @param {{fecha: string, hora: string, veterinarioId: number}} datos
   * @returns {Cita} Cita actualizada.
   */
  reprogramar(id, { fecha, hora, veterinarioId }) {
    this.ejecutar('UPDATE citas SET fecha = ?, hora = ?, veterinario_id = ? WHERE id = ?', fecha, hora, veterinarioId, id);
    return this.buscarPorId(id);
  }

  /** @returns {number} Cantidad de servicios registrados. */
  contarServicios() {
    return this.uno('SELECT COUNT(*) AS total FROM servicios').total;
  }

  /** @returns {number} Cantidad de citas registradas. */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM citas').total;
  }
}

module.exports = CitaDAO;
