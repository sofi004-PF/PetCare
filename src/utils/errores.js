/**
 * Error de regla de negocio. Los controladores lo lanzan y la capa web
 * lo traduce a una respuesta HTTP con el código indicado.
 */
class ErrorNegocio extends Error {
  /**
   * @param {string} mensaje - Descripción del error para el usuario.
   * @param {number} [estado=400] - Código HTTP sugerido (400, 403, 404, 409).
   */
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.estado = estado;
  }
}

/**
 * Contrato: Lanza un ErrorNegocio si la condición no se cumple.
 * @param {*} condicion - Condición que debe ser verdadera.
 * @param {string} mensaje - Mensaje del error.
 * @param {number} [estado=400] - Código HTTP.
 * @throws {ErrorNegocio}
 */
function exigir(condicion, mensaje, estado = 400) {
  if (!condicion) {
    throw new ErrorNegocio(mensaje, estado);
  }
}

/**
 * Contrato: Valida que los campos indicados tengan valor.
 * @param {Object} datos - Objeto a validar.
 * @param {Object<string, string>} campos - Mapa campo → nombre legible.
 * @throws {ErrorNegocio} Si algún campo está vacío.
 */
function exigirCampos(datos, campos) {
  const faltantes = Object.entries(campos)
    .filter(([campo]) => datos[campo] === undefined || datos[campo] === null || String(datos[campo]).trim() === '')
    .map(([, nombre]) => nombre);
  exigir(faltantes.length === 0, `Faltan datos obligatorios: ${faltantes.join(', ')}`);
}

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { ErrorNegocio, exigir, exigirCampos, PATRON_CORREO };
