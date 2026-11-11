const TratamientoDAO = require('../dao/TratamientoDAO');
const Tratamiento = require('../models/Tratamiento');
const { exigir, exigirCampos } = require('../utils/errores');
const { transaccion } = require('../dao/db');

/**
 * Fachada para el registro y seguimiento de tratamientos (HU-09).
 */
class TratamientoController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Validación de mascotas.
   */
  constructor(propietarioController) {
    this.tratamientoDAO = new TratamientoDAO();
    this.propietarios = propietarioController;
  }

  /**
   * Contrato: Registra un tratamiento prescrito a una mascota.
   * @param {{mascotaId: number, medicamento: string, dosis: string, frecuencia: string, duracion: string, indicaciones?: string}} datos
   * @param {{id: number, rol: string}} veterinario - Veterinario que prescribe.
   * @returns {Tratamiento} Tratamiento activo.
   * @throws {ErrorNegocio} Si faltan datos o el usuario no es veterinario.
   */
  registrar({ mascotaId, medicamento, dosis, frecuencia, duracion, indicaciones }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede registrar tratamientos', 403);
    exigirCampos({ mascotaId, medicamento, dosis, frecuencia, duracion },
      { mascotaId: 'mascota', medicamento: 'medicamento', dosis: 'dosis', frecuencia: 'frecuencia', duracion: 'duración' });
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    return this.tratamientoDAO.guardar({
      mascotaId: mascota.id,
      veterinarioId: veterinario.id,
      medicamento: String(medicamento).trim(),
      dosis: String(dosis).trim(),
      frecuencia: String(frecuencia).trim(),
      duracion: String(duracion).trim(),
      indicaciones: indicaciones ? String(indicaciones).trim() : null
    });
  }

  /**
   * Contrato: Tratamientos actuales y anteriores de una mascota.
   * @param {number} mascotaId - Mascota.
   * @param {Object} usuario - Usuario autenticado (el cliente solo ve sus mascotas).
   * @returns {{actuales: Array<Tratamiento>, anteriores: Array<Tratamiento>}} Tratamientos separados por estado.
   */
  listarPorMascota(mascotaId, usuario) {
    this.propietarios.verificarAccesoMascota(usuario, mascotaId);
    const todos = this.tratamientoDAO.listar({ mascotaId: Number(mascotaId) });
    return {
      actuales: todos.filter((t) => t.estado === Tratamiento.ESTADOS.ACTIVO),
      anteriores: todos.filter((t) => t.estado === Tratamiento.ESTADOS.FINALIZADO)
    };
  }

  /**
   * Contrato: Lista los tratamientos activos de todos los pacientes.
   * @returns {Array<Tratamiento>} Tratamientos activos.
   */
  listarActivos() {
    return this.tratamientoDAO.listar({ estado: Tratamiento.ESTADOS.ACTIVO });
  }

  /**
   * Contrato: Registra una observación sobre la evolución del tratamiento y,
   * si se indica, lo finaliza.
   * @param {number} id - Tratamiento.
   * @param {{nota: string, finalizar?: boolean}} datos - Observación.
   * @param {{id: number, rol: string}} veterinario - Veterinario que observa.
   * @returns {Tratamiento} Tratamiento actualizado.
   * @throws {ErrorNegocio} Si el tratamiento ya está finalizado o falta la observación.
   */
  registrarEvolucion(id, { nota, finalizar = false }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede registrar la evolución', 403);
    exigirCampos({ nota }, { nota: 'observación' });
    const tratamiento = this.tratamientoDAO.buscarPorId(Number(id));
    exigir(tratamiento, 'El tratamiento no existe', 404);
    exigir(tratamiento.estado === Tratamiento.ESTADOS.ACTIVO, 'El tratamiento ya está finalizado');
    transaccion(() => {
      this.tratamientoDAO.guardarEvolucion({ tratamientoId: tratamiento.id, veterinarioId: veterinario.id, nota: String(nota).trim(), finaliza: Boolean(finalizar) });
      if (finalizar) this.tratamientoDAO.finalizar(tratamiento.id);
    });
    return this.tratamientoDAO.buscarPorId(tratamiento.id);
  }

  /**
   * Contrato: Eventos de tratamientos para el historial clínico (HU-02).
   * @param {number} mascotaId - Mascota.
   * @returns {Array<Object>} Eventos.
   */
  eventosHistorial(mascotaId) {
    return this.tratamientoDAO.listar({ mascotaId }).map((t) => ({
      tipo: 'Tratamiento',
      fecha: t.fechaInicio,
      titulo: `${t.medicamento} (${t.estado.toLowerCase()})`,
      detalle: `${t.dosis} · ${t.frecuencia} · ${t.duracion}${t.indicaciones ? `\n${t.indicaciones}` : ''}`,
      autor: t.veterinarioNombre
    }));
  }

  /**
   * Contrato: Registra un tratamiento de ejemplo.
   * @param {Object} veterinario - Veterinario autor.
   */
  sembrar(veterinario) {
    if (this.tratamientoDAO.contar() > 0 || !veterinario) return;
    const [luna] = this.propietarios.buscarMascotas('Luna');
    if (!luna) return;
    const tratamiento = this.registrar({
      mascotaId: luna.id,
      medicamento: 'Amoxicilina 250 mg',
      dosis: '1/2 tableta',
      frecuencia: 'Cada 12 horas',
      duracion: '7 días',
      indicaciones: 'Administrar con alimento.'
    }, veterinario);
    this.registrarEvolucion(tratamiento.id, { nota: 'Mejora del apetito al tercer día.' }, veterinario);
  }
}

module.exports = TratamientoController;
