const PropietarioDAO = require('../dao/PropietarioDAO');
const { transaccion } = require('../dao/db');
const Propietario = require('../models/Propietario');
const { exigir, exigirCampos, PATRON_CORREO } = require('../utils/errores');

const ESPECIES = ['Canino', 'Felino', 'Ave', 'Roedor', 'Reptil', 'Otro'];

/**
 * Controlador que actúa como fachada (Facade) para la gestión de
 * propietarios de mascotas (HU-07).
 * Centraliza las reglas de negocio y simplifica la interacción de las vistas
 * con el sistema: las vistas solo conocen esta clase, nunca el DAO.
 */
class PropietarioController {
  /**
   * @param {import('./UsuarioController')} [usuarioController] - Para crear el acceso del cliente.
   */
  constructor(usuarioController = null) {
    this.propietarioDAO = new PropietarioDAO();
    this.usuarioController = usuarioController;
  }

  /**
   * Contrato: Retorna la lista de propietarios registrados.
   * @param {string} [busqueda] - Filtro por nombre o documento.
   * @returns {Array<Propietario>} Propietarios de la clínica.
   */
  listarPropietarios(busqueda = '') {
    return this.propietarioDAO.obtenerTodos(String(busqueda || '').trim());
  }

  /**
   * Contrato: Consulta la información de un propietario por su documento.
   * @param {string} documento - Documento de identidad del propietario.
   * @returns {Propietario} El propietario encontrado.
   * @throws {ErrorNegocio} Si el propietario no está registrado.
   */
  consultarPropietario(documento) {
    const propietario = this.propietarioDAO.buscarPorDocumento(documento);
    exigir(propietario, `No existe un propietario con documento ${documento}`, 404);
    return propietario;
  }

  /**
   * Contrato: Consulta un propietario por su id.
   * @param {number} id - Identificador.
   * @returns {Propietario} El propietario con sus mascotas.
   * @throws {ErrorNegocio} 404 si no existe.
   */
  obtenerPropietario(id) {
    const propietario = this.propietarioDAO.buscarPorId(Number(id));
    exigir(propietario, 'El propietario no existe', 404);
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
   * @throws {ErrorNegocio} Si falta un dato obligatorio o el documento ya existe.
   */
  registrarPropietario(nombre, documento, telefono, correo, direccion) {
    exigirCampos({ nombre, documento, telefono, correo, direccion },
      { nombre: 'nombre', documento: 'documento', telefono: 'teléfono', correo: 'correo', direccion: 'dirección' });
    exigir(PATRON_CORREO.test(String(correo).trim()), 'El correo no tiene un formato válido');
    exigir(!this.propietarioDAO.buscarPorDocumento(String(documento).trim()), `Ya existe un propietario con documento ${documento}`, 409);
    const propietario = new Propietario(null, nombre.trim(), String(documento).trim(), String(telefono).trim(), correo.trim(), direccion.trim());
    return this.propietarioDAO.guardar(propietario);
  }

  /**
   * Contrato: Registra un propietario y, opcionalmente, su usuario de acceso
   * (rol cliente) para que agende citas desde la página.
   * @param {Object} datos - nombre, documento, telefono, correo, direccion, crearAcceso, password.
   * @returns {Propietario} El propietario registrado.
   * @throws {ErrorNegocio} Si los datos no son válidos.
   */
  registrarConAcceso(datos) {
    return transaccion(() => {
      const propietario = this.registrarPropietario(datos.nombre, datos.documento, datos.telefono, datos.correo, datos.direccion);
      if (datos.crearAcceso && this.usuarioController) {
        this.usuarioController.crearUsuario({
          nombre: propietario.nombre,
          correo: propietario.correo,
          password: datos.password,
          rol: 'cliente',
          propietarioId: propietario.id
        });
      }
      return propietario;
    });
  }

  /**
   * Contrato: Actualiza los datos de contacto de un propietario.
   * @param {string} documento - Documento del propietario.
   * @param {Object} cambios - Campos a modificar (nombre, telefono, correo, direccion).
   * @returns {Propietario} El propietario actualizado.
   * @throws {ErrorNegocio} Si el propietario no está registrado o el correo no es válido.
   */
  actualizarPropietario(documento, cambios) {
    const propietario = this.consultarPropietario(documento);
    return this.actualizarPorId(propietario.id, cambios);
  }

  /**
   * Contrato: Actualiza un propietario por su id.
   * @param {number} id - Propietario.
   * @param {Object} cambios - Campos a modificar (nombre, telefono, correo, direccion).
   * @returns {Propietario} El propietario actualizado.
   * @throws {ErrorNegocio} Si no existe o el correo no es válido.
   */
  actualizarPorId(id, cambios) {
    this.obtenerPropietario(id);
    if (cambios.correo !== undefined) {
      exigir(PATRON_CORREO.test(String(cambios.correo).trim()), 'El correo no tiene un formato válido');
    }
    const limpios = {};
    ['nombre', 'telefono', 'correo', 'direccion'].forEach((campo) => {
      if (cambios[campo] !== undefined) {
        exigir(String(cambios[campo]).trim() !== '', `El campo ${campo} no puede quedar vacío`);
        limpios[campo] = String(cambios[campo]).trim();
      }
    });
    return this.propietarioDAO.actualizar(Number(id), limpios);
  }

  /**
   * Contrato: Asocia una mascota a un propietario registrado.
   * @param {string} documento - Documento del propietario.
   * @param {string} nombreMascota - Nombre de la mascota.
   * @param {string} especie - Especie de la mascota (ej: Canino, Felino).
   * @returns {Propietario} El propietario con la mascota asociada.
   * @throws {ErrorNegocio} Si el propietario no existe o faltan datos de la mascota.
   */
  asociarMascota(documento, nombreMascota, especie) {
    const propietario = this.consultarPropietario(documento);
    this.registrarMascota(propietario.id, { nombre: nombreMascota, especie });
    return this.obtenerPropietario(propietario.id);
  }

  /**
   * Contrato: Registra una mascota con sus datos completos.
   * @param {number} propietarioId - Propietario.
   * @param {{nombre: string, especie: string, raza?: string, sexo?: string, fechaNacimiento?: string}} datos
   * @returns {import('../models/Mascota')} Mascota registrada.
   * @throws {ErrorNegocio} Si faltan datos o el propietario no existe.
   */
  registrarMascota(propietarioId, datos) {
    this.obtenerPropietario(propietarioId);
    this.validarMascota(datos);
    return this.propietarioDAO.guardarMascota(Number(propietarioId), this.limpiarMascota(datos));
  }

  /**
   * Contrato: Actualiza los datos de una mascota.
   * @param {number} id - Mascota.
   * @param {Object} datos - nombre, especie, raza, sexo, fechaNacimiento.
   * @returns {import('../models/Mascota')} Mascota actualizada.
   */
  actualizarMascota(id, datos) {
    this.obtenerMascota(id);
    this.validarMascota(datos);
    return this.propietarioDAO.actualizarMascota(Number(id), this.limpiarMascota(datos));
  }

  /**
   * Contrato: Consulta las mascotas asociadas a un propietario.
   * @param {string} documento - Documento del propietario.
   * @returns {Array<import('../models/Mascota')>} Mascotas del propietario.
   * @throws {ErrorNegocio} Si el propietario no está registrado.
   */
  listarMascotas(documento) {
    return this.consultarPropietario(documento).mascotas;
  }

  /**
   * Contrato: Busca pacientes por nombre de la mascota o documento del dueño.
   * @param {string} [busqueda] - Texto a buscar.
   * @returns {Array<import('../models/Mascota')>} Mascotas encontradas.
   */
  buscarMascotas(busqueda = '') {
    return this.propietarioDAO.buscarMascotas(String(busqueda || '').trim());
  }

  /**
   * Contrato: Consulta una mascota por id.
   * @param {number} id - Mascota.
   * @returns {import('../models/Mascota')} Mascota con datos del dueño.
   * @throws {ErrorNegocio} 404 si no existe.
   */
  obtenerMascota(id) {
    const mascota = this.propietarioDAO.buscarMascota(Number(id));
    exigir(mascota, 'La mascota no existe', 404);
    return mascota;
  }

  /**
   * Contrato: Verifica que un usuario pueda ver una mascota. Los clientes
   * solo acceden a sus propias mascotas; el personal accede a todas.
   * @param {{rol: string, propietarioId: number|null}} usuario - Usuario autenticado.
   * @param {number} mascotaId - Mascota.
   * @returns {import('../models/Mascota')} La mascota.
   * @throws {ErrorNegocio} 403 si el cliente no es dueño de la mascota.
   */
  verificarAccesoMascota(usuario, mascotaId) {
    const mascota = this.obtenerMascota(mascotaId);
    if (usuario.rol === 'cliente') {
      exigir(mascota.propietarioId === usuario.propietarioId, 'Solo puede consultar sus propias mascotas', 403);
    }
    return mascota;
  }

  /**
   * Contrato: Verifica que un usuario pueda ver un propietario.
   * @param {{rol: string, propietarioId: number|null}} usuario - Usuario autenticado.
   * @param {number} propietarioId - Propietario.
   * @throws {ErrorNegocio} 403 si un cliente intenta ver a otro propietario.
   */
  verificarAccesoPropietario(usuario, propietarioId) {
    if (usuario.rol === 'cliente') {
      exigir(Number(propietarioId) === usuario.propietarioId, 'Solo puede consultar su propia información', 403);
    }
  }

  /** @returns {Array<string>} Especies disponibles. */
  listarEspecies() {
    return ESPECIES;
  }

  validarMascota({ nombre, especie, sexo, fechaNacimiento }) {
    exigirCampos({ nombre, especie }, { nombre: 'nombre de la mascota', especie: 'especie' });
    exigir(ESPECIES.includes(especie), `La especie debe ser una de: ${ESPECIES.join(', ')}`);
    if (sexo) exigir(['Macho', 'Hembra'].includes(sexo), 'El sexo debe ser Macho o Hembra');
    if (fechaNacimiento) {
      exigir(/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento), 'La fecha de nacimiento no es válida');
      exigir(fechaNacimiento <= new Date().toISOString().slice(0, 10), 'La fecha de nacimiento no puede ser futura');
    }
  }

  limpiarMascota({ nombre, especie, raza, sexo, fechaNacimiento }) {
    return { nombre: String(nombre).trim(), especie, raza: raza ? String(raza).trim() : null, sexo: sexo || null, fechaNacimiento: fechaNacimiento || null };
  }

  /**
   * Contrato: Carga propietarios, mascotas y un usuario cliente de prueba.
   * @param {string} passwordInicial - Contraseña del cliente de prueba.
   */
  sembrar(passwordInicial) {
    if (this.propietarioDAO.contar() > 0) return;
    const laura = this.registrarPropietario('Laura Gómez', '1085123456', '3104567890', 'laura.gomez@correo.com', 'Calle 18 # 25-40, Pasto');
    this.registrarMascota(laura.id, { nombre: 'Max', especie: 'Canino', raza: 'Labrador', sexo: 'Macho', fechaNacimiento: '2021-03-14' });
    this.registrarMascota(laura.id, { nombre: 'Nala', especie: 'Felino', raza: 'Criollo', sexo: 'Hembra', fechaNacimiento: '2023-07-02' });

    const carlos = this.registrarPropietario('Carlos Rosero', '1085987654', '3127894561', 'carlos.rosero@correo.com', 'Carrera 27 # 12-15, Pasto');
    this.registrarMascota(carlos.id, { nombre: 'Luna', especie: 'Felino', raza: 'Siamés', sexo: 'Hembra', fechaNacimiento: '2020-11-20' });

    const ana = this.registrarPropietario('Ana Benavides', '1086456789', '3159871234', 'ana.benavides@correo.com', 'Avenida Panamericana # 5-30, Pasto');
    this.registrarMascota(ana.id, { nombre: 'Rocky', especie: 'Canino', raza: 'Bulldog francés', sexo: 'Macho', fechaNacimiento: '2022-01-09' });

    if (this.usuarioController) {
      this.usuarioController.crearUsuario({ nombre: laura.nombre, correo: 'cliente@petcare.com', password: passwordInicial, rol: 'cliente', propietarioId: laura.id });
    }
  }
}

module.exports = PropietarioController;
