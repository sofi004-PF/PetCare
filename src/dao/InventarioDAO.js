const { BaseDAO } = require('./db');

const SELECT_PRODUCTO = `
  SELECT pr.*,
    COALESCE((SELECT SUM(l.cantidad_disponible) FROM lotes l
              WHERE l.producto_id = pr.id AND l.fecha_caducidad >= date('now', 'localtime')), 0) AS stock,
    COALESCE((SELECT SUM(l.cantidad_disponible) FROM lotes l
              WHERE l.producto_id = pr.id AND l.fecha_caducidad < date('now', 'localtime')), 0) AS stock_vencido,
    (SELECT MIN(l.fecha_caducidad) FROM lotes l
              WHERE l.producto_id = pr.id AND l.cantidad_disponible > 0 AND l.fecha_caducidad >= date('now', 'localtime')) AS proxima_caducidad
  FROM productos pr`;

/**
 * DAO del Inventario de farmacia (HU-04): productos, lotes con fecha de
 * caducidad y movimientos de entrada y salida.
 * El stock disponible solo cuenta lotes no vencidos.
 */
class InventarioDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL,
        unidad TEXT NOT NULL,
        stock_minimo INTEGER NOT NULL,
        precio_venta INTEGER NOT NULL,
        iva_porcentaje INTEGER NOT NULL DEFAULT 19,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE TABLE IF NOT EXISTS lotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        codigo TEXT NOT NULL,
        cantidad_inicial INTEGER NOT NULL,
        cantidad_disponible INTEGER NOT NULL,
        fecha_caducidad TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        UNIQUE (producto_id, codigo)
      );
      CREATE TABLE IF NOT EXISTS movimientos_inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        lote_id INTEGER REFERENCES lotes(id),
        tipo TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        motivo TEXT NOT NULL,
        referencia TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato: Lista los productos con su stock disponible.
   * @returns {Array<Object>} Productos con stock, stock vencido y próxima caducidad.
   */
  listarProductos() {
    return this.todos(`${SELECT_PRODUCTO} ORDER BY pr.nombre`);
  }

  /** @param {number} id @returns {Object|null} Producto con stock. */
  buscarProducto(id) {
    return this.uno(`${SELECT_PRODUCTO} WHERE pr.id = ?`, id);
  }

  /**
   * Contrato: Inserta un producto.
   * @param {{nombre: string, tipo: string, unidad: string, stockMinimo: number, precioVenta: number, ivaPorcentaje: number}} datos
   * @returns {Object} Producto.
   */
  guardarProducto({ nombre, tipo, unidad, stockMinimo, precioVenta, ivaPorcentaje }) {
    const { id } = this.ejecutar(
      'INSERT INTO productos (nombre, tipo, unidad, stock_minimo, precio_venta, iva_porcentaje) VALUES (?, ?, ?, ?, ?, ?)',
      nombre, tipo, unidad, stockMinimo, precioVenta, ivaPorcentaje
    );
    return this.buscarProducto(id);
  }

  /**
   * Contrato: Actualiza los datos de un producto.
   * @param {number} id - Producto.
   * @param {{nombre: string, tipo: string, unidad: string, stockMinimo: number, precioVenta: number, ivaPorcentaje: number}} datos
   * @returns {Object} Producto.
   */
  actualizarProducto(id, { nombre, tipo, unidad, stockMinimo, precioVenta, ivaPorcentaje }) {
    this.ejecutar('UPDATE productos SET nombre = ?, tipo = ?, unidad = ?, stock_minimo = ?, precio_venta = ?, iva_porcentaje = ? WHERE id = ?',
      nombre, tipo, unidad, stockMinimo, precioVenta, ivaPorcentaje, id);
    return this.buscarProducto(id);
  }

  /**
   * Contrato: Registra un lote nuevo.
   * @param {{productoId: number, codigo: string, cantidad: number, fechaCaducidad: string}} datos
   * @returns {Object} Lote.
   */
  guardarLote({ productoId, codigo, cantidad, fechaCaducidad }) {
    const { id } = this.ejecutar(
      'INSERT INTO lotes (producto_id, codigo, cantidad_inicial, cantidad_disponible, fecha_caducidad) VALUES (?, ?, ?, ?, ?)',
      productoId, codigo, cantidad, cantidad, fechaCaducidad
    );
    return this.uno('SELECT * FROM lotes WHERE id = ?', id);
  }

  /**
   * Contrato: Lotes de un producto (más próximos a vencer primero).
   * @param {number} productoId - Producto.
   * @returns {Array<Object>} Lotes.
   */
  listarLotes(productoId) {
    return this.todos('SELECT * FROM lotes WHERE producto_id = ? ORDER BY fecha_caducidad, id', productoId);
  }

  /**
   * Contrato: Lotes vigentes con unidades disponibles, en orden FEFO
   * (primero en vencer, primero en salir).
   * @param {number} productoId - Producto.
   * @returns {Array<Object>} Lotes.
   */
  lotesDisponibles(productoId) {
    return this.todos(`SELECT * FROM lotes WHERE producto_id = ? AND cantidad_disponible > 0
      AND fecha_caducidad >= date('now', 'localtime') ORDER BY fecha_caducidad, id`, productoId);
  }

  /**
   * @param {number} loteId - Lote.
   * @param {number} cantidad - Unidades a restar.
   */
  restarDeLote(loteId, cantidad) {
    this.ejecutar('UPDATE lotes SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?', cantidad, loteId);
  }

  /**
   * Contrato: Registra un movimiento de inventario.
   * @param {{productoId: number, loteId?: number, tipo: string, cantidad: number, motivo: string, referencia?: string, usuarioId?: number}} datos
   */
  guardarMovimiento({ productoId, loteId = null, tipo, cantidad, motivo, referencia = null, usuarioId = null }) {
    this.ejecutar(
      'INSERT INTO movimientos_inventario (producto_id, lote_id, tipo, cantidad, motivo, referencia, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      productoId, loteId, tipo, cantidad, motivo, referencia, usuarioId
    );
  }

  /**
   * Contrato: Últimos movimientos (de un producto o de todos).
   * @param {number|null} productoId - Producto o null para todos.
   * @param {number} [limite=50] - Máximo de filas.
   * @returns {Array<Object>} Movimientos.
   */
  listarMovimientos(productoId = null, limite = 50) {
    return this.todos(`SELECT mv.*, pr.nombre AS producto_nombre, l.codigo AS lote_codigo, u.nombre AS usuario_nombre
      FROM movimientos_inventario mv
      JOIN productos pr ON pr.id = mv.producto_id
      LEFT JOIN lotes l ON l.id = mv.lote_id
      LEFT JOIN usuarios u ON u.id = mv.usuario_id
      WHERE (? IS NULL OR mv.producto_id = ?)
      ORDER BY mv.id DESC LIMIT ?`, productoId, productoId, limite);
  }

  /** @returns {number} Cantidad de productos. */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM productos').total;
  }
}

module.exports = InventarioDAO;
