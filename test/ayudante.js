/**
 * Utilidades para las pruebas: base de datos en memoria y un servidor
 * temporal con sesiones por usuario.
 */
process.env.PETCARE_DB = ':memory:';
process.env.PETCARE_UPLOADS = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'petcare-test-'));

const { crearApp } = require('../src/app');
const { sembrarDatos, PASSWORD_PRUEBA } = require('../src/dao/seed');

sembrarDatos();

/**
 * Inicia el servidor en un puerto libre.
 * @returns {Promise<{url: string, cerrar: Function, como: Function}>}
 */
async function iniciarServidor() {
  const servidor = crearApp().listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const url = `http://127.0.0.1:${servidor.address().port}`;

  /**
   * Crea un cliente HTTP autenticado con el correo indicado.
   * @param {string} correo - Usuario de prueba.
   */
  async function como(correo) {
    const respuesta = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password: PASSWORD_PRUEBA })
    });
    if (!respuesta.ok) throw new Error(`No se pudo iniciar sesión como ${correo}`);
    const cookie = respuesta.headers.get('set-cookie').split(';')[0];
    const pedir = async (metodo, ruta, cuerpo) => {
      const r = await fetch(`${url}/api${ruta}`, {
        method: metodo,
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
      });
      const tipo = r.headers.get('content-type') || '';
      return { estado: r.status, datos: tipo.includes('json') ? await r.json() : await r.text() };
    };
    return {
      get: (ruta) => pedir('GET', ruta),
      post: (ruta, cuerpo = {}) => pedir('POST', ruta, cuerpo),
      put: (ruta, cuerpo = {}) => pedir('PUT', ruta, cuerpo),
      patch: (ruta, cuerpo = {}) => pedir('PATCH', ruta, cuerpo),
      del: (ruta) => pedir('DELETE', ruta)
    };
  }

  return { url, como, cerrar: () => new Promise((r) => servidor.close(r)) };
}

module.exports = { iniciarServidor, PASSWORD_PRUEBA };
