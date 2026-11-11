const ConsultaDAO = require('../dao/ConsultaDAO');
const { exigir, exigirCampos } = require('../utils/errores');
const { transaccion } = require('../dao/db');

/**
 * Fachada para el registro de consultas veterinarias (HU-08).
 * La consulta queda asociada a la mascota y al veterinario que la atiende
 * (el usuario que inicia sesión). Si viene de una cita, la cita pasa a "Atendida".
 */
class ConsultaController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Validación de mascotas.
   * @param {import('./CitaController')} citaController - Para marcar la cita como atendida.
   * @param {import('./InventarioController')} [inventarioController] - Para descontar los insumos usados (HU-04).
   */
  constructor(propietarioController, citaController, inventarioController = null) {
    this.consultaDAO = new ConsultaDAO();
    this.propietarios = propietarioController;
    this.citas = citaController;
    this.inventario = inventarioController;
  }

  /**
   * Contrato: Registra una consulta realizada por el veterinario autenticado.
   * @param {{mascotaId: number, citaId?: number, motivo: string, sintomas: string, diagnostico: string,
   *          observaciones?: string, pesoKg?: number, temperaturaC?: number,
   *          insumos?: Array<{productoId: number, cantidad: number}>}} datos
   *        Los insumos usados se descuentan automáticamente del inventario (HU-04).
   * @param {{id: number, rol: string}} veterinario - Usuario que atiende.
   * @returns {import('../models/Consulta')} Consulta registrada con fecha y hora automáticas.
   * @throws {ErrorNegocio} Si faltan datos, la mascota no existe, la cita no corresponde o no hay stock.
   */
  registrar({ mascotaId, citaId, motivo, sintomas, diagnostico, observaciones, pesoKg, temperaturaC, insumos = [] }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede registrar consultas', 403);
    exigirCampos({ mascotaId, motivo, sintomas, diagnostico },
      { mascotaId: 'mascota', motivo: 'motivo de consulta', sintomas: 'síntomas', diagnostico: 'diagnóstico' });
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    const peso = this.numeroOpcional(pesoKg, 'El peso', 0, 200);
    const temperatura = this.numeroOpcional(temperaturaC, 'La temperatura', 30, 45);

    return transaccion(() => {
      if (citaId) {
        const cita = this.citas.citaDAO.buscarPorId(Number(citaId));
        exigir(cita, 'La cita no existe', 404);
        exigir(cita.mascotaId === mascota.id, 'La cita no corresponde a esta mascota');
        this.citas.marcarAtendida(cita.id);
      }
      const consulta = this.consultaDAO.guardar({
        mascotaId: mascota.id,
        veterinarioId: veterinario.id,
        citaId: citaId ? Number(citaId) : null,
        motivo: String(motivo).trim(),
        sintomas: String(sintomas).trim(),
        diagnostico: String(diagnostico).trim(),
        observaciones: observaciones ? String(observaciones).trim() : null,
        pesoKg: peso,
        temperaturaC: temperatura
      });
      if (this.inventario && Array.isArray(insumos)) {
        for (const insumo of insumos.filter((i) => i && i.productoId)) {
          this.inventario.descontar(insumo.productoId, insumo.cantidad, {
            motivo: 'Uso en consulta',
            referencia: `Consulta #${consulta.id} (${mascota.nombre})`,
            usuarioId: veterinario.id
          });
        }
      }
      return consulta;
    });
  }

  /**
   * Contrato: Lista las consultas anteriores de una mascota (de la más reciente a la más antigua).
   * @param {number} mascotaId - Mascota.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {Array<import('../models/Consulta')>} Consultas.
   */
  listarPorMascota(mascotaId, usuario) {
    this.propietarios.verificarAccesoMascota(usuario, mascotaId);
    return this.consultaDAO.listar({ mascotaId: Number(mascotaId) });
  }

  /**
   * Contrato: Lista consultas con filtros (fecha, veterinario).
   * @param {{fecha?: string, veterinarioId?: number}} filtros
   * @returns {Array<import('../models/Consulta')>} Consultas.
   */
  listar(filtros = {}) {
    return this.consultaDAO.listar({
      fecha: filtros.fecha || null,
      veterinarioId: filtros.veterinarioId ? Number(filtros.veterinarioId) : null
    });
  }

  /**
   * Contrato: Consulta una consulta por id.
   * @param {number} id - Consulta.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {import('../models/Consulta')} Consulta.
   */
  obtener(id, usuario) {
    const consulta = this.consultaDAO.buscarPorId(Number(id));
    exigir(consulta, 'La consulta no existe', 404);
    this.propietarios.verificarAccesoMascota(usuario, consulta.mascotaId);
    return consulta;
  }

  /**
   * Contrato: Eventos de consultas para la línea de tiempo del historial clínico (HU-02).
   * @param {number} mascotaId - Mascota.
   * @returns {Array<Object>} Eventos {tipo, fecha, titulo, detalle, autor}.
   */
  eventosHistorial(mascotaId) {
    return this.consultaDAO.listar({ mascotaId }).map((c) => ({
      tipo: 'Consulta',
      fecha: c.fecha,
      titulo: c.motivo,
      detalle: [`Síntomas: ${c.sintomas}`, `Diagnóstico: ${c.diagnostico}`, c.observaciones ? `Observaciones: ${c.observaciones}` : null]
        .filter(Boolean).join('\n'),
      autor: c.veterinarioNombre
    }));
  }

  numeroOpcional(valor, nombre, minimo, maximo) {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    exigir(Number.isFinite(numero) && numero > minimo && numero < maximo, `${nombre} no tiene un valor válido`);
    return numero;
  }

  /**
   * Contrato: Registra consultas de ejemplo.
   */
  sembrar() {
    if (this.consultaDAO.contar() > 0) return;
    const veterinario = this.citas.usuarioDAO.obtenerPorRol('veterinario')[0];
    const [max] = this.propietarios.buscarMascotas('Max');
    if (!veterinario || !max) return;
    this.registrar({
      mascotaId: max.id,
      motivo: 'Control de rutina',
      sintomas: 'Sin síntomas. Buen apetito y actividad normal.',
      diagnostico: 'Paciente sano',
      observaciones: 'Se recomienda control en 6 meses.',
      pesoKg: 28.5,
      temperaturaC: 38.6
    }, veterinario);
  }
}

module.exports = ConsultaController;
