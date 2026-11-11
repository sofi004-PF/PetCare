/**
 * Configuración de la agenda de la clínica (HU-01).
 * Horario de atención de lunes a sábado en dos jornadas, con citas de 30 minutos.
 */
const AGENDA = {
  diasLaborales: [1, 2, 3, 4, 5, 6], // lunes a sábado
  jornadas: [['08:00', '12:00'], ['14:00', '18:00']],
  duracionMinutos: 30,
  diasVisibles: 14
};

const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/**
 * Contrato: Lista las horas de inicio de cita de un día laboral.
 * @returns {Array<string>} Horas en formato HH:MM.
 */
function horariosDelDia() {
  const horas = [];
  for (const [inicio, fin] of AGENDA.jornadas) {
    for (let m = aMinutos(inicio); m + AGENDA.duracionMinutos <= aMinutos(fin); m += AGENDA.duracionMinutos) {
      horas.push(aHora(m));
    }
  }
  return horas;
}

module.exports = { AGENDA, horariosDelDia };
