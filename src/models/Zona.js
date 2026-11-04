/**
 * Modelo de datos que representa la entidad Zona (HU03)
 * Aplica el principio de responsabilidad única (SOLID - SRP)
 */
class Zona {
  constructor(id, nombre, capacidad, precioBase) {
    this.id = id;
    this.nombre = nombre; // ej: VIP, Preferencial, General
    this.capacidad = capacidad; // Cantidad máxima de entradas
    this.precioBase = precioBase; // Valor expresado en COP
  }
}

module.exports = Zona;