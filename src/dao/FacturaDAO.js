const { BaseDAO } = require('./db');

const SELECT_FACTURA = `
  SELECT f.*, p.nombre AS cliente_nombre, p.documento AS cliente_documento, p.correo AS cliente_correo,
         p.telefono AS cliente_telefono, p.direccion AS cliente_direccion, u.nombre AS creado_por_nombre
  FROM facturas f
  JOIN propietarios p ON p.id = f.propietario_id
  JOIN usuarios u ON u.id = f.creado_por`;

/**
 * DAO de Facturas por servicios y productos (HU-05).
 */
class FacturaDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT UNIQUE,
        propietario_id INTEGER NOT NULL REFERENCES propietarios(id),
        subtotal INTEGER NOT NULL,
        iva INTEGER NOT NULL,
        total INTEGER NOT NULL,
        metodo_pago TEXT NOT NULL,
        enviada_en TEXT,
        creado_por INTEGER NOT NULL REFERENCES usuarios(id),
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE TABLE IF NOT EXISTS factura_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER NOT NULL REFERENCES facturas(id),
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        cita_id INTEGER UNIQUE REFERENCES citas(id),
        producto_id INTEGER REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario INTEGER NOT NULL,
        iva_porcentaje INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        iva INTEGER NOT NULL,
        total INTEGER NOT NULL
      );
    `);
  }

  /**
   * Contrato: Guarda una factura con sus ítems y le asigna un número consecutivo.
   * @param {{propietarioId: number, metodoPago: string, creadoPor: number, items: Array<Object>,
   *          subtotal: number, iva: number, total: number}} datos
   * @returns {Object} Factura completa.
   */
  guardar({ propietarioId, metodoPago, creadoPor, items, subtotal, iva, total }) {
    const { id } = this.ejecutar(
      'INSERT INTO facturas (propietario_id, subtotal, iva, total, metodo_pago, creado_por) VALUES (?, ?, ?, ?, ?, ?)',
      propietarioId, subtotal, iva, total, metodoPago, creadoPor
    );
    this.ejecutar('UPDATE facturas SET numero = ? WHERE id = ?', `FV-${String(id).padStart(5, '0')}`, id);
    for (const item of items) {
      this.ejecutar(
        `INSERT INTO factura_items (factura_id, tipo, descripcion, cita_id, producto_id, cantidad, precio_unitario, iva_porcentaje, subtotal, iva, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, item.tipo, item.descripcion, item.citaId || null, item.productoId || null, item.cantidad,
        item.precioUnitario, item.ivaPorcentaje, item.subtotal, item.iva, item.total
      );
    }
    return this.buscarPorId(id);
  }

  /** @param {number} id @returns {Object|null} Factura con sus ítems. */
  buscarPorId(id) {
    const fila = this.uno(`${SELECT_FACTURA} WHERE f.id = ?`, id);
    return fila ? { ...fila, items: this.todos('SELECT * FROM factura_items WHERE factura_id = ? ORDER BY id', id) } : null;
  }

  /**
   * Contrato: Lista facturas con filtros opcionales.
   * @param {{propietarioId?: number, desde?: string, hasta?: string}} filtros
   * @returns {Array<Object>} Facturas (sin ítems), de la más reciente a la más antigua.
   */
  listar({ propietarioId = null, desde = null, hasta = null } = {}) {
    return this.todos(`${SELECT_FACTURA}
      WHERE (? IS NULL OR f.propietario_id = ?) AND (? IS NULL OR date(f.creado_en) >= ?) AND (? IS NULL OR date(f.creado_en) <= ?)
      ORDER BY f.id DESC`, propietarioId, propietarioId, desde, desde, hasta, hasta);
  }

  /**
   * Contrato: Citas atendidas de un propietario que todavía no se han facturado.
   * @param {number} propietarioId - Cliente.
   * @returns {Array<Object>} Citas con servicio, mascota y costo.
   */
  citasPorFacturar(propietarioId) {
    return this.todos(`
      SELECT c.id, c.fecha, c.hora, c.costo, s.nombre AS servicio_nombre, m.nombre AS mascota_nombre
      FROM citas c
      JOIN mascotas m ON m.id = c.mascota_id
      JOIN servicios s ON s.id = c.servicio_id
      WHERE m.propietario_id = ? AND c.estado = 'Atendida'
        AND NOT EXISTS (SELECT 1 FROM factura_items fi WHERE fi.cita_id = c.id)
      ORDER BY c.fecha, c.hora`, propietarioId);
  }

  /** @param {number} id - Factura enviada por correo. */
  marcarEnviada(id) {
    this.ejecutar("UPDATE facturas SET enviada_en = datetime('now', 'localtime') WHERE id = ?", id);
  }
}

module.exports = FacturaDAO;
