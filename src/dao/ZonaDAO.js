const Zona = require('../models/Zona');

/**
 * Clase DAO para gestionar la persistencia y consulta de Zonas (HU03)
 * Simula la integración con Base de Datos
 */
class ZonaDAO {
  constructor() {
    // Persistencia simulada en memoria para el prototipo
    this.zonasBD = [
      new Zona(1, 'VIP', 500, 250000),
      new Zona(2, 'Preferencial', 1200, 150000),
      new Zona(3, 'General', 3000, 80000)
    ];
  }

  /**
   * Contrato de método: Retorna la lista completa de zonas
   * @returns {Array<Zona>} Lista de entidades
   */
  obtenerTodas() {
    return this.zonasBD;
  }

  /**
   * Contrato de método: Inserta una nueva zona en la base de datos
   * @param {Zona} nuevaZona
   * @returns {Zona} Objeto guardado
   */
  guardar(nuevaZona) {
    this.zonasBD.push(nuevaZona);
    return nuevaZona;
  }
}

module.exports = ZonaDAO;