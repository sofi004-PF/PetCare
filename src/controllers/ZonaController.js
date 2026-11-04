const ZonaDAO = require('../dao/ZonaDAO');
const Zona = require('../models/Zona');

/**
 * Controlador que actúa como fachada (Facade) para la gestión de zonas y precios (HU03)
 */
class ZonaController {
  constructor() {
    this.zonaDAO = new ZonaDAO();
  }

  /**
   * Contrato: Retorna la lista de zonas configuradas
   */
  listarZonas() {
    return this.zonaDAO.obtenerTodas();
  }

  /**
   * Contrato: Parametriza y registra una nueva zona
   */
  crearZona(id, nombre, capacidad, precio) {
    const zona = new Zona(id, nombre, capacidad, precio);
    return this.zonaDAO.guardar(zona);
  }
}

module.exports = ZonaController;