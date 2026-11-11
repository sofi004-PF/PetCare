const PropietarioDAO = require('../dao/PropietarioDAO');
const Propietario = require('../models/Propietario');

/**
 * Controlador que actúa como fachada (Facade) para la gestión de
 * propietarios de mascotas (HU-07).
 * Centraliza las reglas de negocio y simplifica la interacción de las vistas
 * con el sistema: las vistas solo conocen esta clase, nunca el DAO.
 */
class PropietarioController {
  constructor() {
    this.propietarioDAO = new PropietarioDAO();
  }

  /**
   * Contrato: Retorna la lista de propietarios registrados.
   * @returns {Array<Propietario>} Propietarios de la clínica.
   */
  listarPropietarios() {
    return this.propietarioDAO.obtenerTodos();
  }

  /**
   * Contrato: Consulta la información de un propietario por su documento.
   * @param {string} documento - Documento de identidad del propietario.
   * @returns {Propietario} El propietario encontrado.
   * @throws {Error} Si el propietario no está registrado.
   */
  consultarPropietario(documento) {
    const propietario = this.propietarioDAO.buscarPorDocumento(documento);
    if (!propietario) {
      throw new Error(`No existe un propietario con documento ${documento}`);
    }
    return propietario;
  }

  /**
   * Contrato: Registra un nuevo propietario validando los datos obligatorios
   * y que el documento no esté repetido.
   * @param {string} nombre - Nombre completo.
   * @param {string} documento - Documento de identidad (único).
   * @param {string} telefono - Teléfono de contacto.
   * @param {string} correo - Correo electrónico.
   * @param {string} direccion - Dirección de residencia.
   * @returns {Propietario} El propietario registrado.
   * @throws {Error} Si falta un dato obligatorio o el documento ya existe.
   */
  registrarPropietario(nombre, documento, telefono, correo, direccion) {
    if (!nombre || !documento || !telefono || !correo || !direccion) {
      throw new Error('Todos los datos del propietario son obligatorios');
    }
    if (this.propietarioDAO.buscarPorDocumento(documento)) {
      throw new Error(`Ya existe un propietario con documento ${documento}`);
    }
    const id = this.propietarioDAO.siguienteId();
    const propietario = new Propietario(id, nombre, documento, telefono, correo, direccion);
    return this.propietarioDAO.guardar(propietario);
  }

  /**
   * Contrato: Actualiza los datos de contacto de un propietario.
   * @param {string} documento - Documento del propietario.
   * @param {Object} cambios - Campos a modificar (nombre, telefono, correo, direccion).
   * @returns {Propietario} El propietario actualizado.
   * @throws {Error} Si el propietario no está registrado.
   */
  actualizarPropietario(documento, cambios) {
    const propietario = this.propietarioDAO.actualizar(documento, cambios);
    if (!propietario) {
      throw new Error(`No existe un propietario con documento ${documento}`);
    }
    return propietario;
  }

  /**
   * Contrato: Asocia una mascota a un propietario registrado.
   * @param {string} documento - Documento del propietario.
   * @param {string} nombreMascota - Nombre de la mascota.
   * @param {string} especie - Especie de la mascota (ej: Canino, Felino).
   * @returns {Propietario} El propietario con la mascota asociada.
   * @throws {Error} Si el propietario no existe o faltan datos de la mascota.
   */
  asociarMascota(documento, nombreMascota, especie) {
    if (!nombreMascota || !especie) {
      throw new Error('El nombre y la especie de la mascota son obligatorios');
    }
    const propietario = this.consultarPropietario(documento);
    propietario.mascotas.push({ nombre: nombreMascota, especie });
    return propietario;
  }

  /**
   * Contrato: Consulta las mascotas asociadas a un propietario.
   * @param {string} documento - Documento del propietario.
   * @returns {Array<{nombre: string, especie: string}>} Mascotas del propietario.
   * @throws {Error} Si el propietario no está registrado.
   */
  listarMascotas(documento) {
    return this.consultarPropietario(documento).mascotas;
  }
}

module.exports = PropietarioController;
