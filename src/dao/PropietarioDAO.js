const Propietario = require('../models/Propietario');

/**
 * Clase DAO para gestionar la persistencia y consulta de Propietarios (HU-07).
 * Simula la integración con la base de datos de la clínica veterinaria.
 * La lógica de negocio consume estos métodos sin saber cómo ni dónde
 * se almacenan los datos.
 */
class PropietarioDAO {
  constructor() {
    // Persistencia simulada en memoria para el prototipo
    const propietario1 = new Propietario(1, 'Laura Gómez', '1085123456', '3104567890', 'laura.gomez@correo.com', 'Calle 18 # 25-40, Pasto');
    propietario1.mascotas.push({ nombre: 'Max', especie: 'Canino' });

    const propietario2 = new Propietario(2, 'Carlos Rosero', '1085987654', '3127894561', 'carlos.rosero@correo.com', 'Carrera 27 # 12-15, Pasto');
    propietario2.mascotas.push({ nombre: 'Luna', especie: 'Felino' });

    const propietario3 = new Propietario(3, 'Ana Benavides', '1086456789', '3159871234', 'ana.benavides@correo.com', 'Avenida Panamericana # 5-30, Pasto');

    this.propietariosBD = [propietario1, propietario2, propietario3];
  }

  /**
   * Contrato de método: Retorna la lista completa de propietarios.
   * @returns {Array<Propietario>} Lista de entidades.
   */
  obtenerTodos() {
    return this.propietariosBD;
  }

  /**
   * Contrato de método: Busca un propietario por su número de documento.
   * @param {string} documento - Documento de identidad del propietario.
   * @returns {Propietario|null} El propietario encontrado o null si no existe.
   */
  buscarPorDocumento(documento) {
    return this.propietariosBD.find((p) => p.documento === documento) || null;
  }

  /**
   * Contrato de método: Genera el siguiente identificador disponible.
   * @returns {number} Nuevo id consecutivo.
   */
  siguienteId() {
    return this.propietariosBD.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  }

  /**
   * Contrato de método: Inserta un nuevo propietario en la base de datos.
   * @param {Propietario} nuevoPropietario - Entidad a guardar.
   * @returns {Propietario} Objeto guardado.
   */
  guardar(nuevoPropietario) {
    this.propietariosBD.push(nuevoPropietario);
    return nuevoPropietario;
  }

  /**
   * Contrato de método: Actualiza los datos de un propietario existente.
   * @param {string} documento - Documento del propietario a actualizar.
   * @param {Object} cambios - Campos a modificar (nombre, telefono, correo, direccion).
   * @returns {Propietario|null} El propietario actualizado o null si no existe.
   */
  actualizar(documento, cambios) {
    const propietario = this.buscarPorDocumento(documento);
    if (!propietario) {
      return null;
    }
    const camposEditables = ['nombre', 'telefono', 'correo', 'direccion'];
    camposEditables.forEach((campo) => {
      if (cambios[campo] !== undefined) {
        propietario[campo] = cambios[campo];
      }
    });
    return propietario;
  }
}

module.exports = PropietarioDAO;
