const { ROLES } = require('../config/permisos');

/**
 * Modelo de datos que representa un Usuario del sistema (HU-11).
 * Aplica SRP: describe al usuario y cómo se expone hacia afuera,
 * sin lógica de persistencia ni de autenticación.
 */
class Usuario {
  /**
   * @param {Object} datos - Fila de la base de datos.
   * @param {number} datos.id - Identificador.
   * @param {string} datos.nombre - Nombre completo.
   * @param {string} datos.correo - Correo de acceso (único).
   * @param {string} datos.rol - Rol: administrador, veterinario, recepcionista o cliente.
   * @param {number|boolean} datos.activo - Si el usuario puede iniciar sesión.
   * @param {number|null} [datos.propietario_id] - Propietario asociado (solo rol cliente).
   * @param {string} [datos.creado_en] - Fecha de creación.
   */
  constructor({ id, nombre, correo, rol, activo, propietario_id = null, creado_en = null }) {
    this.id = id;
    this.nombre = nombre;
    this.correo = correo;
    this.rol = rol;
    this.activo = Boolean(activo);
    this.propietarioId = propietario_id;
    this.creadoEn = creado_en;
  }

  /**
   * Contrato: Nombre legible del rol del usuario.
   * @returns {string} Ej: "Personal administrativo".
   */
  get nombreRol() {
    return ROLES[this.rol] || this.rol;
  }

  /**
   * Contrato: Representación segura para enviar al navegador (sin contraseña).
   * @returns {Object} Datos públicos del usuario.
   */
  aPublico() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      rol: this.rol,
      nombreRol: this.nombreRol,
      activo: this.activo,
      propietarioId: this.propietarioId,
      creadoEn: this.creadoEn
    };
  }
}

module.exports = Usuario;
