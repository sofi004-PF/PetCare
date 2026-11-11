/**
 * Modelo de datos que representa un Tratamiento prescrito a una mascota (HU-09).
 */
class Tratamiento {
  /**
   * @param {Object} fila - Fila de la consulta de tratamientos (con JOIN a mascota y veterinario).
   * @param {Array<Object>} [evoluciones] - Observaciones de evolución registradas.
   */
  constructor(fila, evoluciones = []) {
    this.id = fila.id;
    this.mascotaId = fila.mascota_id;
    this.mascotaNombre = fila.mascota_nombre;
    this.veterinarioId = fila.veterinario_id;
    this.veterinarioNombre = fila.veterinario_nombre;
    this.medicamento = fila.medicamento;
    this.dosis = fila.dosis;
    this.frecuencia = fila.frecuencia;
    this.duracion = fila.duracion;
    this.indicaciones = fila.indicaciones;
    this.estado = fila.estado;
    this.fechaInicio = fila.fecha_inicio;
    this.fechaFin = fila.fecha_fin;
    this.evoluciones = evoluciones.map((e) => ({
      id: e.id,
      nota: e.nota,
      finaliza: Boolean(e.finaliza),
      veterinarioNombre: e.veterinario_nombre,
      creadoEn: e.creado_en
    }));
  }
}

Tratamiento.ESTADOS = { ACTIVO: 'Activo', FINALIZADO: 'Finalizado' };

module.exports = Tratamiento;
