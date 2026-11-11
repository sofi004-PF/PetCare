const { BaseDAO } = require('./db');
const Propietario = require('../models/Propietario');
const Mascota = require('../models/Mascota');

/**
 * Clase DAO para gestionar la persistencia y consulta de Propietarios y sus
 * Mascotas (HU-07) en SQLite. La lógica de negocio consume estos métodos sin
 * saber cómo ni dónde se almacenan los datos.
 */
class PropietarioDAO extends BaseDAO {
  constructor() {
    super();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS propietarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        documento TEXT NOT NULL UNIQUE,
        telefono TEXT NOT NULL,
        correo TEXT NOT NULL,
        direccion TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE TABLE IF NOT EXISTS mascotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        propietario_id INTEGER NOT NULL REFERENCES propietarios(id),
        nombre TEXT NOT NULL,
        especie TEXT NOT NULL,
        raza TEXT,
        sexo TEXT,
        fecha_nacimiento TEXT,
        creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);
  }

  /**
   * Contrato de método: Retorna la lista de propietarios, con filtro opcional.
   * @param {string} [busqueda] - Texto a buscar en nombre o documento.
   * @returns {Array<Propietario>} Lista de entidades (con sus mascotas).
   */
  obtenerTodos(busqueda = '') {
    const patron = `%${busqueda}%`;
    return this.todos(
      'SELECT * FROM propietarios WHERE nombre LIKE ? OR documento LIKE ? ORDER BY nombre',
      patron, patron
    ).map((fila) => this.conMascotas(Propietario.desdeFila(fila)));
  }

  /**
   * Contrato de método: Busca un propietario por su id.
   * @param {number} id - Identificador.
   * @returns {Propietario|null} El propietario (con mascotas) o null.
   */
  buscarPorId(id) {
    const fila = this.uno('SELECT * FROM propietarios WHERE id = ?', id);
    return fila ? this.conMascotas(Propietario.desdeFila(fila)) : null;
  }

  /**
   * Contrato de método: Busca un propietario por su número de documento.
   * @param {string} documento - Documento de identidad del propietario.
   * @returns {Propietario|null} El propietario encontrado o null si no existe.
   */
  buscarPorDocumento(documento) {
    const fila = this.uno('SELECT * FROM propietarios WHERE documento = ?', documento);
    return fila ? this.conMascotas(Propietario.desdeFila(fila)) : null;
  }

  /**
   * Contrato de método: Inserta un nuevo propietario en la base de datos.
   * @param {Propietario} nuevoPropietario - Entidad a guardar (sin id).
   * @returns {Propietario} Objeto guardado con su id.
   */
  guardar(nuevoPropietario) {
    const { id } = this.ejecutar(
      'INSERT INTO propietarios (nombre, documento, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)',
      nuevoPropietario.nombre, nuevoPropietario.documento, nuevoPropietario.telefono, nuevoPropietario.correo, nuevoPropietario.direccion
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato de método: Actualiza los datos de un propietario existente.
   * @param {number} id - Propietario a actualizar.
   * @param {Object} cambios - Campos a modificar (nombre, telefono, correo, direccion).
   * @returns {Propietario|null} El propietario actualizado o null si no existe.
   */
  actualizar(id, cambios) {
    const actual = this.buscarPorId(id);
    if (!actual) return null;
    const camposEditables = ['nombre', 'telefono', 'correo', 'direccion'];
    const datos = {};
    camposEditables.forEach((campo) => {
      datos[campo] = cambios[campo] !== undefined ? cambios[campo] : actual[campo];
    });
    this.ejecutar(
      'UPDATE propietarios SET nombre = ?, telefono = ?, correo = ?, direccion = ? WHERE id = ?',
      datos.nombre, datos.telefono, datos.correo, datos.direccion, id
    );
    return this.buscarPorId(id);
  }

  /**
   * Contrato de método: Registra una mascota asociada a un propietario.
   * @param {number} propietarioId - Propietario.
   * @param {{nombre: string, especie: string, raza?: string, sexo?: string, fechaNacimiento?: string}} datos
   * @returns {Mascota} Mascota guardada.
   */
  guardarMascota(propietarioId, { nombre, especie, raza, sexo, fechaNacimiento }) {
    const { id } = this.ejecutar(
      'INSERT INTO mascotas (propietario_id, nombre, especie, raza, sexo, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?)',
      propietarioId, nombre, especie, raza || null, sexo || null, fechaNacimiento || null
    );
    return this.buscarMascota(id);
  }

  /**
   * Contrato de método: Actualiza los datos de una mascota.
   * @param {number} id - Mascota.
   * @param {{nombre: string, especie: string, raza?: string, sexo?: string, fechaNacimiento?: string}} datos
   * @returns {Mascota|null} Mascota actualizada.
   */
  actualizarMascota(id, { nombre, especie, raza, sexo, fechaNacimiento }) {
    this.ejecutar(
      'UPDATE mascotas SET nombre = ?, especie = ?, raza = ?, sexo = ?, fecha_nacimiento = ? WHERE id = ?',
      nombre, especie, raza || null, sexo || null, fechaNacimiento || null, id
    );
    return this.buscarMascota(id);
  }

  /**
   * Contrato de método: Busca una mascota por id, con los datos de su propietario.
   * @param {number} id - Mascota.
   * @returns {Mascota|null} Mascota o null.
   */
  buscarMascota(id) {
    const fila = this.uno(`
      SELECT m.*, p.nombre AS propietario_nombre, p.documento AS propietario_documento
      FROM mascotas m JOIN propietarios p ON p.id = m.propietario_id
      WHERE m.id = ?`, id);
    return fila ? new Mascota(fila) : null;
  }

  /**
   * Contrato de método: Busca mascotas por nombre de la mascota o documento/nombre del dueño.
   * @param {string} [busqueda] - Texto a buscar.
   * @returns {Array<Mascota>} Mascotas encontradas.
   */
  buscarMascotas(busqueda = '') {
    const patron = `%${busqueda}%`;
    return this.todos(`
      SELECT m.*, p.nombre AS propietario_nombre, p.documento AS propietario_documento
      FROM mascotas m JOIN propietarios p ON p.id = m.propietario_id
      WHERE m.nombre LIKE ? OR p.documento LIKE ? OR p.nombre LIKE ?
      ORDER BY m.nombre`, patron, patron, patron).map((f) => new Mascota(f));
  }

  /**
   * Contrato de método: Cantidad de propietarios registrados.
   * @returns {number} Total.
   */
  contar() {
    return this.uno('SELECT COUNT(*) AS total FROM propietarios').total;
  }

  /**
   * Carga las mascotas de un propietario.
   * @param {Propietario} propietario - Entidad.
   * @returns {Propietario} La misma entidad con sus mascotas.
   */
  conMascotas(propietario) {
    propietario.mascotas = this.todos('SELECT * FROM mascotas WHERE propietario_id = ? ORDER BY nombre', propietario.id)
      .map((f) => new Mascota(f));
    return propietario;
  }
}

module.exports = PropietarioDAO;
