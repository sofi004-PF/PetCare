/**
 * Modelo de datos que representa una Consulta veterinaria (HU-08).
 * Una consulta registrada no se edita: forma parte del historial clínico.
 */
class Consulta {
  /**
   * @param {Object} fila - Fila de la consulta (con JOIN a mascota, dueño y veterinario).
   */
  constructor(fila) {
    this.id = fila.id;
    this.mascotaId = fila.mascota_id;
    this.mascotaNombre = fila.mascota_nombre;
    this.propietarioNombre = fila.propietario_nombre;
    this.veterinarioId = fila.veterinario_id;
    this.veterinarioNombre = fila.veterinario_nombre;
    this.citaId = fila.cita_id;
    this.fecha = fila.fecha;
    this.motivo = fila.motivo;
    this.sintomas = fila.sintomas;
    this.diagnostico = fila.diagnostico;
    this.observaciones = fila.observaciones;
    this.pesoKg = fila.peso_kg;
    this.temperaturaC = fila.temperatura_c;
  }
}

module.exports = Consulta;
