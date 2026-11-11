/**
 * Cliente HTTP de la página: todas las llamadas a la API pasan por aquí.
 */

let alExpirarSesion = () => {};

/**
 * Registra la acción a ejecutar cuando la sesión expira (respuesta 401).
 * @param {Function} accion - Función a ejecutar.
 */
export function configurarSesionExpirada(accion) {
  alExpirarSesion = accion;
}

/**
 * Realiza una petición a la API de PetCare.
 * @param {string} metodo - GET, POST, PUT, PATCH o DELETE.
 * @param {string} ruta - Ruta a partir de /api (ej: "/usuarios").
 * @param {Object} [cuerpo] - Datos a enviar en JSON.
 * @returns {Promise<*>} Respuesta en JSON.
 * @throws {Error} Con el mensaje de error que envía el servidor.
 */
export async function api(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  const respuesta = await fetch(`/api${ruta}`, opciones);
  const tipo = respuesta.headers.get('Content-Type') || '';
  const datos = tipo.includes('application/json') ? await respuesta.json() : await respuesta.text();
  if (!respuesta.ok) {
    if (respuesta.status === 401 && !ruta.startsWith('/auth/')) {
      alExpirarSesion();
    }
    throw new Error((datos && datos.error) || `Error ${respuesta.status}`);
  }
  return datos;
}

export const get = (ruta) => api('GET', ruta);
export const post = (ruta, cuerpo = {}) => api('POST', ruta, cuerpo);
export const put = (ruta, cuerpo = {}) => api('PUT', ruta, cuerpo);
export const patch = (ruta, cuerpo = {}) => api('PATCH', ruta, cuerpo);
export const del = (ruta) => api('DELETE', ruta);
