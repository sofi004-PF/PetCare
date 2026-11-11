const controladores = require('../controllers');

/** Contraseña de los usuarios de prueba (ver README). */
const PASSWORD_PRUEBA = 'PetCare2026*';

/**
 * Contrato: Carga datos de prueba la primera vez que se inicia el sistema.
 * Cada módulo solo siembra si sus tablas están vacías.
 */
function sembrarDatos() {
  controladores.usuarios.sembrar(PASSWORD_PRUEBA);
}

module.exports = { sembrarDatos, PASSWORD_PRUEBA };
