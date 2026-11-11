const controladores = require('../controllers');

/** Contraseña de los usuarios de prueba (ver README). */
const PASSWORD_PRUEBA = 'PetCare2026*';

/**
 * Contrato: Carga datos de prueba la primera vez que se inicia el sistema.
 * Cada módulo solo siembra si sus tablas están vacías.
 */
function sembrarDatos() {
  controladores.usuarios.sembrar(PASSWORD_PRUEBA);
  controladores.propietarios.sembrar(PASSWORD_PRUEBA);
  controladores.citas.sembrar();
  controladores.consultas.sembrar();
  controladores.historial.sembrar(controladores.citas.usuarioDAO.obtenerPorRol('veterinario')[0]);
}

module.exports = { sembrarDatos, PASSWORD_PRUEBA };
