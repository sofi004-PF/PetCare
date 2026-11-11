const FacturaDAO = require('../dao/FacturaDAO');
const { CLINICA, IVA_SERVICIOS } = require('../config/clinica');
const { generarPDF } = require('../utils/pdf');
const { exigir, exigirCampos } = require('../utils/errores');
const { transaccion } = require('../dao/db');

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'];

const pesos = (valor) => `$${Number(valor).toLocaleString('es-CO')}`;

/**
 * Fachada de facturación de servicios y productos (HU-05).
 * Calcula subtotales e IVA por ítem, registra el método de pago, descuenta del
 * inventario los productos vendidos (HU-04) y envía la factura al correo del cliente.
 */
class FacturaController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Datos del cliente.
   * @param {import('./InventarioController')} inventarioController - Precios y descuento de productos.
   * @param {import('./NotificacionController')} notificacionController - Envío por correo.
   * @param {import('./CitaController')} citaController - Servicios prestados en citas.
   */
  constructor(propietarioController, inventarioController, notificacionController, citaController) {
    this.facturaDAO = new FacturaDAO();
    this.propietarios = propietarioController;
    this.inventario = inventarioController;
    this.notificaciones = notificacionController;
    this.citas = citaController;
  }

  /**
   * Contrato: Servicios (citas atendidas) de un cliente que aún no se han facturado.
   * @param {number} propietarioId - Cliente.
   * @returns {Array<Object>} Citas por facturar.
   */
  serviciosPorFacturar(propietarioId) {
    this.propietarios.obtenerPropietario(propietarioId);
    return this.facturaDAO.citasPorFacturar(Number(propietarioId));
  }

  /**
   * Contrato: Genera una factura detallada.
   * @param {{propietarioId: number, metodoPago: string, items: Array<
   *   {tipo: 'cita', citaId: number} |
   *   {tipo: 'producto', productoId: number, cantidad: number} |
   *   {tipo: 'servicio', descripcion: string, precio: number, cantidad?: number}>}} datos
   * @param {{id: number}} usuario - Recepcionista o administrador que factura.
   * @returns {Object} Factura con ítems, impuestos y totales.
   * @throws {ErrorNegocio} Si no hay ítems, el método de pago no es válido, la cita no corresponde o no hay stock.
   */
  generar({ propietarioId, metodoPago, items }, usuario) {
    exigirCampos({ propietarioId, metodoPago }, { propietarioId: 'cliente', metodoPago: 'método de pago' });
    exigir(METODOS_PAGO.includes(metodoPago), `El método de pago debe ser: ${METODOS_PAGO.join(', ')}`);
    exigir(Array.isArray(items) && items.length > 0, 'La factura debe tener al menos un ítem');
    const propietario = this.propietarios.obtenerPropietario(propietarioId);
    const pendientes = new Map(this.facturaDAO.citasPorFacturar(propietario.id).map((c) => [c.id, c]));

    return transaccion(() => {
      const lineas = items.map((item, i) => this.construirLinea(item, i, pendientes));
      const totales = lineas.reduce((acc, l) => ({
        subtotal: acc.subtotal + l.subtotal, iva: acc.iva + l.iva, total: acc.total + l.total
      }), { subtotal: 0, iva: 0, total: 0 });
      const factura = this.facturaDAO.guardar({ propietarioId: propietario.id, metodoPago, creadoPor: usuario.id, items: lineas, ...totales });
      for (const linea of lineas.filter((l) => l.productoId)) {
        this.inventario.descontar(linea.productoId, linea.cantidad, { motivo: 'Venta', referencia: `Factura ${factura.numero}`, usuarioId: usuario.id });
      }
      return factura;
    });
  }

  construirLinea(item, indice, pendientes) {
    const posicion = `Ítem ${indice + 1}`;
    let linea;
    if (item.tipo === 'cita') {
      const cita = pendientes.get(Number(item.citaId));
      exigir(cita, `${posicion}: la cita no está atendida, no pertenece al cliente o ya fue facturada`);
      pendientes.delete(cita.id);
      linea = { tipo: 'Servicio', descripcion: `${cita.servicio_nombre} - ${cita.mascota_nombre} (${cita.fecha})`, citaId: cita.id, cantidad: 1, precioUnitario: cita.costo, ivaPorcentaje: IVA_SERVICIOS };
    } else if (item.tipo === 'producto') {
      const producto = this.inventario.inventarioDAO.buscarProducto(Number(item.productoId));
      exigir(producto, `${posicion}: el producto no existe`, 404);
      const cantidad = Number(item.cantidad);
      exigir(Number.isInteger(cantidad) && cantidad > 0, `${posicion}: la cantidad debe ser un entero mayor que cero`);
      linea = { tipo: 'Producto', descripcion: producto.nombre, productoId: producto.id, cantidad, precioUnitario: producto.precio_venta, ivaPorcentaje: producto.iva_porcentaje };
    } else if (item.tipo === 'servicio') {
      const precio = Number(item.precio);
      const cantidad = Number(item.cantidad || 1);
      exigir(String(item.descripcion || '').trim(), `${posicion}: escriba la descripción del servicio o procedimiento`);
      exigir(Number.isInteger(precio) && precio > 0, `${posicion}: el precio debe ser un valor entero mayor que cero`);
      exigir(Number.isInteger(cantidad) && cantidad > 0, `${posicion}: la cantidad debe ser un entero mayor que cero`);
      linea = { tipo: 'Servicio', descripcion: String(item.descripcion).trim(), cantidad, precioUnitario: precio, ivaPorcentaje: IVA_SERVICIOS };
    } else {
      exigir(false, `${posicion}: tipo de ítem no válido`);
    }
    linea.subtotal = linea.precioUnitario * linea.cantidad;
    linea.iva = Math.round(linea.subtotal * linea.ivaPorcentaje / 100);
    linea.total = linea.subtotal + linea.iva;
    return linea;
  }

  /**
   * Contrato: Envía la factura digital al correo del cliente (un clic).
   * @param {number} id - Factura.
   * @returns {Object} Factura con la fecha de envío.
   */
  enviarPorCorreo(id) {
    const factura = this.facturaDAO.buscarPorId(Number(id));
    exigir(factura, 'La factura no existe', 404);
    const propietario = this.propietarios.obtenerPropietario(factura.propietario_id);
    transaccion(() => {
      this.notificaciones.enviar(propietario, {
        canal: 'correo',
        tipo: 'factura',
        asunto: `Factura ${factura.numero} - ${CLINICA.nombre}`,
        cuerpo: [
          `Hola ${propietario.nombre},`,
          '',
          `Adjuntamos la factura ${factura.numero} por ${pesos(factura.total)} (IVA incluido), pagada con ${factura.metodo_pago.toLowerCase()}.`,
          '',
          ...factura.items.map((i) => `• ${i.descripcion} x${i.cantidad}: ${pesos(i.total)}`),
          '',
          'Gracias por confiar en nosotros.',
          CLINICA.nombre
        ].join('\n'),
        enlace: `/api/facturas/${factura.id}/pdf`
      });
      this.facturaDAO.marcarEnviada(factura.id);
    });
    return this.facturaDAO.buscarPorId(factura.id);
  }

  /**
   * Contrato: Lista facturas (el cliente solo ve las suyas).
   * @param {Object} usuario - Usuario autenticado.
   * @param {{desde?: string, hasta?: string}} filtros
   * @returns {Array<Object>} Facturas.
   */
  listar(usuario, { desde, hasta } = {}) {
    return this.facturaDAO.listar({
      propietarioId: usuario.rol === 'cliente' ? (usuario.propietarioId || -1) : null,
      desde: desde || null,
      hasta: hasta || null
    });
  }

  /**
   * Contrato: Consulta una factura.
   * @param {number} id - Factura.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {Object} Factura con ítems.
   */
  obtener(id, usuario) {
    const factura = this.facturaDAO.buscarPorId(Number(id));
    exigir(factura, 'La factura no existe', 404);
    this.propietarios.verificarAccesoPropietario(usuario, factura.propietario_id);
    return { ...factura, clinica: CLINICA };
  }

  /**
   * Contrato: Genera el PDF de la factura.
   * @param {number} id - Factura.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {{nombre: string, contenido: Buffer}} Archivo PDF.
   */
  generarPDF(id, usuario) {
    const f = this.obtener(id, usuario);
    const anchos = [205, 40, 80, 45, 60, 65];
    const derecha = [false, true, true, true, true, true];
    const bloques = [
      { texto: CLINICA.nombre, tamano: 18, negrita: true, color: 'marca' },
      { texto: `NIT ${CLINICA.nit} · ${CLINICA.direccion} · ${CLINICA.telefono}`, tamano: 9 },
      { separador: true },
      { columnas: [`Factura de venta ${f.numero}`, `Fecha: ${f.creado_en.slice(0, 16)}`], negrita: true, anchos: [280, 215] },
      { espacio: 6 },
      { texto: 'Cliente', negrita: true, color: 'marca' },
      { texto: `${f.cliente_nombre} · Documento ${f.cliente_documento}` },
      { texto: `${f.cliente_direccion} · ${f.cliente_telefono} · ${f.cliente_correo}` },
      { espacio: 6 },
      { columnas: ['Descripción', 'Cant.', 'Valor unit.', 'IVA %', 'IVA', 'Total'], negrita: true, anchos, alinearDerecha: derecha, tamano: 10 },
      ...f.items.map((i) => ({
        columnas: [i.descripcion.slice(0, 40), String(i.cantidad), pesos(i.precio_unitario), `${i.iva_porcentaje}%`, pesos(i.iva), pesos(i.total)],
        anchos, alinearDerecha: derecha, tamano: 10
      })),
      { separador: true },
      { columnas: ['', 'Subtotal', pesos(f.subtotal)], anchos: [300, 110, 85], alinearDerecha: [false, false, true] },
      { columnas: ['', 'IVA', pesos(f.iva)], anchos: [300, 110, 85], alinearDerecha: [false, false, true] },
      { columnas: ['', 'Total a pagar', pesos(f.total)], anchos: [300, 110, 85], alinearDerecha: [false, false, true], negrita: true },
      { espacio: 10 },
      { texto: `Método de pago: ${f.metodo_pago}`, negrita: true },
      { texto: `Atendido por: ${f.creado_por_nombre}`, tamano: 9 }
    ];
    return { nombre: `${f.numero}.pdf`, contenido: generarPDF(`Factura ${f.numero}`, bloques) };
  }

  /** @returns {Array<string>} Métodos de pago. */
  listarMetodosPago() {
    return METODOS_PAGO;
  }
}

module.exports = FacturaController;
