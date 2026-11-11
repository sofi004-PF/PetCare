/**
 * Utilidades de fecha en hora local de la clínica.
 */

const dosDigitos = (n) => String(n).padStart(2, '0');

/**
 * Contrato: Fecha local en formato AAAA-MM-DD.
 * @param {Date} [fecha=new Date()] - Fecha a formatear.
 * @returns {string} Fecha.
 */
function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/**
 * Contrato: Hora local en formato HH:MM.
 * @param {Date} [fecha=new Date()] - Fecha a formatear.
 * @returns {string} Hora.
 */
function horaLocal(fecha = new Date()) {
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/**
 * Contrato: Suma días a una fecha AAAA-MM-DD.
 * @param {string} fecha - Fecha base.
 * @param {number} dias - Días a sumar (pueden ser negativos).
 * @returns {string} Nueva fecha AAAA-MM-DD.
 */
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

/**
 * Contrato: Día de la semana (0 = domingo, 6 = sábado).
 * @param {string} fecha - AAAA-MM-DD.
 * @returns {number} Día.
 */
function diaSemana(fecha) {
  return new Date(`${fecha}T12:00:00`).getDay();
}

/**
 * Contrato: Indica si un texto es una fecha válida AAAA-MM-DD.
 * @param {string} fecha - Texto.
 * @returns {boolean} true si es válida.
 */
function esFechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return false;
  return fechaLocal(new Date(`${fecha}T12:00:00`)) === fecha;
}

module.exports = { fechaLocal, horaLocal, sumarDias, diaSemana, esFechaValida };
