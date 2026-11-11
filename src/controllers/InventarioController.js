const InventarioDAO = require('../dao/InventarioDAO');
const { exigir, exigirCampos } = require('../utils/errores');
const { fechaLocal, sumarDias, esFechaValida } = require('../utils/fechas');
const { transaccion } = require('../dao/db');

const TIPOS = ['Medicamento', 'Vacuna', 'Insumo', 'Alimento'];
const DIAS_ALERTA_CADUCIDAD = 30;

/**
 * Fachada del inventario de farmacia veterinaria (HU-04).
 * Reglas: el stock disponible solo cuenta lotes vigentes; las salidas se
 * descuentan automáticamente en orden FEFO (primero en vencer, primero en
 * salir); se alerta cuando un producto baja de su stock mínimo.
 */
class InventarioController {
  constructor() {
    this.inventarioDAO = new InventarioDAO();
  }

  /**
   * Contrato: Lista los productos con su stock y estado de alerta.
   * @returns {Array<Object>} Productos.
   */
  listarProductos() {
    return this.inventarioDAO.listarProductos().map((p) => this.conAlertas(p));
  }

  /**
   * Contrato: Productos por debajo de su stock mínimo (alerta del panel principal).
   * @returns {Array<Object>} Productos con stock bajo.
   */
  alertasStock() {
    return this.listarProductos().filter((p) => p.bajoMinimo);
  }

  /**
   * Contrato: Detalle de un producto con sus lotes y movimientos.
   * @param {number} id - Producto.
   * @returns {Object} Producto, lotes y movimientos.
   */
  obtenerProducto(id) {
    const producto = this.inventarioDAO.buscarProducto(Number(id));
    exigir(producto, 'El producto no existe', 404);
    return {
      ...this.conAlertas(producto),
      lotes: this.inventarioDAO.listarLotes(producto.id).map((l) => ({ ...l, vencido: l.fecha_caducidad < fechaLocal() })),
      movimientos: this.inventarioDAO.listarMovimientos(producto.id)
    };
  }

  /**
   * Contrato: Registra un producto nuevo.
   * @param {{nombre: string, tipo: string, unidad: string, stockMinimo: number, precioVenta: number, ivaPorcentaje?: number}} datos
   * @returns {Object} Producto.
   */
  crearProducto(datos) {
    return this.inventarioDAO.guardarProducto(this.validarProducto(datos));
  }

  /**
   * Contrato: Actualiza un producto.
   * @param {number} id - Producto.
   * @param {Object} datos - Mismos campos que crearProducto.
   * @returns {Object} Producto.
   */
  actualizarProducto(id, datos) {
    exigir(this.inventarioDAO.buscarProducto(Number(id)), 'El producto no existe', 404);
    return this.inventarioDAO.actualizarProducto(Number(id), this.validarProducto(datos));
  }

  /**
   * Contrato: Registra un lote nuevo de un producto, con su fecha de caducidad.
   * @param {number} productoId - Producto.
   * @param {{codigo: string, cantidad: number, fechaCaducidad: string}} datos - Datos del lote.
   * @param {{id: number}} usuario - Administrador que registra.
   * @returns {Object} Producto actualizado.
   * @throws {ErrorNegocio} Si la cantidad no es positiva o el lote ya está vencido.
   */
  registrarLote(productoId, { codigo, cantidad, fechaCaducidad }, usuario) {
    const producto = this.inventarioDAO.buscarProducto(Number(productoId));
    exigir(producto, 'El producto no existe', 404);
    exigirCampos({ codigo, cantidad, fechaCaducidad }, { codigo: 'código del lote', cantidad: 'cantidad', fechaCaducidad: 'fecha de caducidad' });
    const unidades = Number(cantidad);
    exigir(Number.isInteger(unidades) && unidades > 0, 'La cantidad debe ser un número entero mayor que cero');
    exigir(esFechaValida(fechaCaducidad), 'La fecha de caducidad no es válida');
    exigir(fechaCaducidad > fechaLocal(), 'No se puede registrar un lote vencido');
    transaccion(() => {
      const lote = this.inventarioDAO.guardarLote({ productoId: producto.id, codigo: String(codigo).trim(), cantidad: unidades, fechaCaducidad });
      this.inventarioDAO.guardarMovimiento({ productoId: producto.id, loteId: lote.id, tipo: 'Entrada', cantidad: unidades, motivo: 'Ingreso de lote', referencia: lote.codigo, usuarioId: usuario.id });
    });
    return this.obtenerProducto(producto.id);
  }

  /**
   * Contrato: Resta unidades del inventario (venta o uso en consulta), en orden FEFO.
   * Debe llamarse dentro de la transacción de la operación que lo origina.
   * @param {number} productoId - Producto.
   * @param {number} cantidad - Unidades a descontar.
   * @param {{motivo: string, referencia?: string, usuarioId?: number}} origen - Motivo del descuento.
   * @returns {Object} Producto con el stock actualizado.
   * @throws {ErrorNegocio} Si no hay unidades suficientes en lotes vigentes.
   */
  descontar(productoId, cantidad, { motivo, referencia = null, usuarioId = null }) {
    const producto = this.inventarioDAO.buscarProducto(Number(productoId));
    exigir(producto, 'El producto no existe', 404);
    const unidades = Number(cantidad);
    exigir(Number.isInteger(unidades) && unidades > 0, `La cantidad de ${producto.nombre} debe ser un entero mayor que cero`);
    exigir(producto.stock >= unidades, `Stock insuficiente de ${producto.nombre}: hay ${producto.stock} ${producto.unidad}(s) disponibles`, 409);

    return transaccion(() => {
      let pendiente = unidades;
      for (const lote of this.inventarioDAO.lotesDisponibles(producto.id)) {
        if (pendiente === 0) break;
        const tomar = Math.min(pendiente, lote.cantidad_disponible);
        this.inventarioDAO.restarDeLote(lote.id, tomar);
        this.inventarioDAO.guardarMovimiento({ productoId: producto.id, loteId: lote.id, tipo: 'Salida', cantidad: tomar, motivo, referencia, usuarioId });
        pendiente -= tomar;
      }
      return this.conAlertas(this.inventarioDAO.buscarProducto(producto.id));
    });
  }

  /**
   * Contrato: Últimos movimientos de inventario.
   * @returns {Array<Object>} Movimientos.
   */
  listarMovimientos() {
    return this.inventarioDAO.listarMovimientos(null, 100);
  }

  /** @returns {Array<string>} Tipos de producto. */
  listarTipos() {
    return TIPOS;
  }

  conAlertas(producto) {
    const limite = sumarDias(fechaLocal(), DIAS_ALERTA_CADUCIDAD);
    return {
      ...producto,
      bajoMinimo: producto.stock < producto.stock_minimo,
      proximoAVencer: Boolean(producto.proxima_caducidad && producto.proxima_caducidad <= limite)
    };
  }

  validarProducto({ nombre, tipo, unidad, stockMinimo, precioVenta, ivaPorcentaje = 19 }) {
    exigirCampos({ nombre, tipo, unidad, stockMinimo, precioVenta },
      { nombre: 'nombre', tipo: 'tipo', unidad: 'unidad', stockMinimo: 'stock mínimo', precioVenta: 'precio de venta' });
    exigir(TIPOS.includes(tipo), `El tipo debe ser uno de: ${TIPOS.join(', ')}`);
    const minimo = Number(stockMinimo);
    const precio = Number(precioVenta);
    const iva = Number(ivaPorcentaje);
    exigir(Number.isInteger(minimo) && minimo >= 0, 'El stock mínimo debe ser un entero mayor o igual a cero');
    exigir(Number.isInteger(precio) && precio >= 0, 'El precio debe ser un valor entero en pesos');
    exigir([0, 5, 19].includes(iva), 'El IVA debe ser 0 %, 5 % o 19 %');
    return { nombre: String(nombre).trim(), tipo, unidad: String(unidad).trim(), stockMinimo: minimo, precioVenta: precio, ivaPorcentaje: iva };
  }

  /**
   * Contrato: Carga productos y lotes de ejemplo (algunos por debajo del mínimo).
   * @param {Object} administrador - Usuario que registra los lotes.
   */
  sembrar(administrador) {
    if (this.inventarioDAO.contar() > 0 || !administrador) return;
    const productos = [
      { nombre: 'Amoxicilina 250 mg', tipo: 'Medicamento', unidad: 'tableta', stockMinimo: 20, precioVenta: 1500, ivaPorcentaje: 5, lote: ['AMX-2611', 60, 240] },
      { nombre: 'Vacuna antirrábica', tipo: 'Vacuna', unidad: 'dosis', stockMinimo: 10, precioVenta: 30000, ivaPorcentaje: 5, lote: ['RAB-0925', 6, 120] },
      { nombre: 'Desparasitante canino (tableta)', tipo: 'Medicamento', unidad: 'tableta', stockMinimo: 15, precioVenta: 12000, ivaPorcentaje: 5, lote: ['DSP-1102', 25, 25] },
      { nombre: 'Jeringa 3 ml', tipo: 'Insumo', unidad: 'unidad', stockMinimo: 50, precioVenta: 800, ivaPorcentaje: 19, lote: ['JER-7781', 200, 700] },
      { nombre: 'Concentrado cachorro 2 kg', tipo: 'Alimento', unidad: 'bolsa', stockMinimo: 5, precioVenta: 48000, ivaPorcentaje: 19, lote: ['ALM-3320', 3, 180] }
    ];
    for (const { lote: [codigo, cantidad, dias], ...datos } of productos) {
      const producto = this.crearProducto(datos);
      this.registrarLote(producto.id, { codigo, cantidad, fechaCaducidad: sumarDias(fechaLocal(), dias) }, administrador);
    }
  }
}

module.exports = InventarioController;
