const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

/**
 * Conexión única (Singleton) a la base de datos SQLite de PetCare.
 * La ruta puede cambiarse con la variable de entorno PETCARE_DB
 * (por ejemplo ":memory:" para las pruebas automáticas).
 */
const RUTA_BD = process.env.PETCARE_DB || path.join(__dirname, '..', '..', 'data', 'petcare.db');

let conexion = null;

/**
 * Contrato: Retorna la conexión abierta, creándola si aún no existe.
 * @returns {DatabaseSync} Conexión a SQLite.
 */
function obtenerConexion() {
  if (!conexion) {
    if (RUTA_BD !== ':memory:') {
      fs.mkdirSync(path.dirname(RUTA_BD), { recursive: true });
    }
    conexion = new DatabaseSync(RUTA_BD);
    conexion.exec('PRAGMA foreign_keys = ON;');
    if (RUTA_BD !== ':memory:') {
      conexion.exec('PRAGMA journal_mode = WAL;');
    }
  }
  return conexion;
}

/**
 * Contrato: Ejecuta una función dentro de una transacción.
 * Si la función lanza un error, se revierten todos los cambios.
 * @template T
 * @param {() => T} operacion - Función con las operaciones a ejecutar.
 * @returns {T} El valor retornado por la operación.
 */
function transaccion(operacion) {
  const db = obtenerConexion();
  db.exec('BEGIN');
  try {
    const resultado = operacion();
    db.exec('COMMIT');
    return resultado;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Convierte los valores de JavaScript a tipos que SQLite acepta.
 * @param {Array<*>} parametros - Valores para la consulta.
 * @returns {Array<*>} Valores normalizados.
 */
function normalizar(parametros) {
  return parametros.map((valor) => {
    if (valor === undefined) return null;
    if (typeof valor === 'boolean') return valor ? 1 : 0;
    return valor;
  });
}

/**
 * Clase base para todos los DAO: encapsula el acceso a SQLite para que
 * cada DAO solo escriba sus consultas.
 */
class BaseDAO {
  constructor() {
    this.db = obtenerConexion();
  }

  /**
   * Contrato: Ejecuta una consulta y retorna todas las filas.
   * @param {string} sql - Consulta con parámetros "?".
   * @param {...*} parametros - Valores de los parámetros.
   * @returns {Array<Object>} Filas encontradas.
   */
  todos(sql, ...parametros) {
    return this.db.prepare(sql).all(...normalizar(parametros)).map((fila) => ({ ...fila }));
  }

  /**
   * Contrato: Ejecuta una consulta y retorna la primera fila.
   * @param {string} sql - Consulta con parámetros "?".
   * @param {...*} parametros - Valores de los parámetros.
   * @returns {Object|null} Fila encontrada o null.
   */
  uno(sql, ...parametros) {
    const fila = this.db.prepare(sql).get(...normalizar(parametros));
    return fila ? { ...fila } : null;
  }

  /**
   * Contrato: Ejecuta una instrucción INSERT, UPDATE o DELETE.
   * @param {string} sql - Instrucción con parámetros "?".
   * @param {...*} parametros - Valores de los parámetros.
   * @returns {{cambios: number, id: number}} Filas afectadas e id insertado.
   */
  ejecutar(sql, ...parametros) {
    const resultado = this.db.prepare(sql).run(...normalizar(parametros));
    return { cambios: Number(resultado.changes), id: Number(resultado.lastInsertRowid) };
  }
}

module.exports = { obtenerConexion, transaccion, BaseDAO };
