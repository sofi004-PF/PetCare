/**
 * Modelo de datos que representa la entidad Propietario (HU-07).
 * Aplica el principio de responsabilidad única (SOLID - SRP):
 * solo describe la estructura del propietario, sin lógica de persistencia
 * ni de presentación.
 */
class Propietario {
  /**
   * @param {number} id - Identificador interno del propietario.
   * @param {string} nombre - Nombre completo del propietario.
   * @param {string} documento - Número de documento de identidad (único).
   * @param {string} telefono - Teléfono de contacto.
   * @param {string} correo - Correo electrónico de contacto.
   * @param {string} direccion - Dirección de residencia.
   */
  constructor(id, nombre, documento, telefono, correo, direccion) {
    this.id = id;
    this.nombre = nombre;
    this.documento = documento;
    this.telefono = telefono;
    this.correo = correo;
    this.direccion = direccion;
    /** @type {Array<import('./Mascota')>} */
    this.mascotas = []; // Mascotas asociadas al propietario
  }

  /**
   * Contrato: Construye un Propietario a partir de una fila de la base de datos.
   * @param {Object} fila - Fila de la tabla propietarios.
   * @returns {Propietario} Entidad.
   */
  static desdeFila(fila) {
    const propietario = new Propietario(fila.id, fila.nombre, fila.documento, fila.telefono, fila.correo, fila.direccion);
    propietario.creadoEn = fila.creado_en;
    return propietario;
  }
}

module.exports = Propietario;
