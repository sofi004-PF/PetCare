const controladores = require('./controllers');

const UNA_HORA = 60 * 60 * 1000;

/**
 * Contrato: Inicia las tareas automáticas del servidor.
 * - HU-03: envío de recordatorios de vacunación y desparasitación 3 días antes.
 * @returns {NodeJS.Timeout} Temporizador (para detenerlo en pruebas).
 */
function iniciarTareas() {
  const ejecutar = () => {
    try {
      const enviados = controladores.recordatorios.procesarPendientes();
      if (enviados > 0) console.log(`Recordatorios enviados: ${enviados}`);
    } catch (error) {
      console.error('Error al procesar recordatorios', error);
    }
  };
  ejecutar();
  return setInterval(ejecutar, UNA_HORA);
}

module.exports = { iniciarTareas };
