/**
 * Modelo de datos que representa la entidad Mascota (paciente de la clínica).
 * Aplica SRP: solo describe la estructura del paciente.
 */
class Mascota {
  /**
   * @param {Object} datos - Fila de la base de datos.
   * @param {number} datos.id - Identificador.
   * @param {number} datos.propietario_id - Propietario de la mascota.
   * @param {string} datos.nombre - Nombre.
   * @param {string} datos.especie - Especie (ej: Canino, Felino).
   * @param {string} [datos.raza] - Raza.
   * @param {string} [datos.sexo] - Macho o Hembra.
   * @param {string} [datos.fecha_nacimiento] - Fecha de nacimiento (AAAA-MM-DD).
   * @param {string} [datos.propietario_nombre] - Nombre del propietario (consultas con JOIN).
   * @param {string} [datos.propietario_documento] - Documento del propietario (consultas con JOIN).
   */
  constructor({ id, propietario_id, nombre, especie, raza = null, sexo = null, fecha_nacimiento = null, propietario_nombre, propietario_documento }) {
    this.id = id;
    this.propietarioId = propietario_id;
    this.nombre = nombre;
    this.especie = especie;
    this.raza = raza;
    this.sexo = sexo;
    this.fechaNacimiento = fecha_nacimiento;
    if (propietario_nombre !== undefined) this.propietarioNombre = propietario_nombre;
    if (propietario_documento !== undefined) this.propietarioDocumento = propietario_documento;
  }
}

module.exports = Mascota;
