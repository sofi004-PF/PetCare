/**
 * Modelo de datos que representa una Cita médica (HU-01).
 */
class Cita {
  /**
   * @param {Object} fila - Fila de la consulta de citas (con JOIN a mascota, dueño, veterinario y servicio).
   */
  constructor(fila) {
    this.id = fila.id;
    this.codigo = fila.codigo;
    this.fecha = fila.fecha;
    this.hora = fila.hora;
    this.estado = fila.estado;
    this.motivo = fila.motivo;
    this.mascotaId = fila.mascota_id;
    this.mascotaNombre = fila.mascota_nombre;
    this.propietarioId = fila.propietario_id;
    this.propietarioNombre = fila.propietario_nombre;
    this.veterinarioId = fila.veterinario_id;
    this.veterinarioNombre = fila.veterinario_nombre;
    this.servicioId = fila.servicio_id;
    this.servicioNombre = fila.servicio_nombre;
    this.costo = fila.costo;
    this.creadoEn = fila.creado_en;
  }
}

/** Estados posibles de una cita. */
Cita.ESTADOS = { PROGRAMADA: 'Programada', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada' };

module.exports = Cita;
