const crypto = require('crypto');
const RecordatorioDAO = require('../dao/RecordatorioDAO');
const { exigir, exigirCampos } = require('../utils/errores');
const { fechaLocal, sumarDias, esFechaValida } = require('../utils/fechas');
const { transaccion } = require('../dao/db');

const DIAS_ANTICIPACION = 3;
const TIPOS = ['Vacuna', 'Desparasitación'];
const CANALES = ['correo', 'sms'];
const ESTADOS = { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado' };

/**
 * Fachada de notificaciones automáticas de vacunación y desparasitación (HU-03).
 * El veterinario programa la fecha desde el historial clínico; el sistema
 * envía el mensaje 3 días antes, y el cliente confirma o cancela su asistencia
 * desde el enlace del mismo mensaje.
 */
class RecordatorioController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Validación de mascotas.
   * @param {import('./NotificacionController')} notificacionController - Envío de mensajes.
   */
  constructor(propietarioController, notificacionController) {
    this.recordatorioDAO = new RecordatorioDAO();
    this.propietarios = propietarioController;
    this.notificaciones = notificacionController;
  }

  /**
   * Contrato: Programa un recordatorio para una fecha futura.
   * @param {{mascotaId: number, tipo: string, descripcion: string, fechaProgramada: string, canal?: string}} datos
   * @param {{id: number, rol: string}} veterinario - Veterinario que programa.
   * @returns {Object} Recordatorio pendiente.
   * @throws {ErrorNegocio} Si la fecha es pasada, el tipo o canal no son válidos.
   */
  programar({ mascotaId, tipo, descripcion, fechaProgramada, canal = 'correo' }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede programar recordatorios', 403);
    exigirCampos({ mascotaId, tipo, descripcion, fechaProgramada },
      { mascotaId: 'mascota', tipo: 'tipo', descripcion: 'descripción', fechaProgramada: 'fecha programada' });
    exigir(TIPOS.includes(tipo), 'El tipo debe ser Vacuna o Desparasitación');
    exigir(CANALES.includes(canal), 'El canal debe ser correo o SMS');
    exigir(esFechaValida(fechaProgramada), 'La fecha programada no es válida');
    exigir(fechaProgramada > fechaLocal(), 'La fecha programada debe ser futura');
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    const recordatorio = this.recordatorioDAO.guardar({
      mascotaId: mascota.id,
      tipo,
      descripcion: String(descripcion).trim(),
      fechaProgramada,
      canal,
      token: crypto.randomBytes(24).toString('hex'),
      creadoPor: veterinario.id
    });
    // Si la fecha ya está dentro del plazo de aviso, se envía de inmediato.
    this.procesarPendientes();
    return this.publico(this.recordatorioDAO.buscarPorId(recordatorio.id));
  }

  /**
   * Contrato: Envía los recordatorios cuya fecha está a 3 días o menos.
   * Lo ejecuta una tarea programada del servidor; cada recordatorio se envía una sola vez.
   * @param {string} [hoy] - Fecha de referencia (por defecto, hoy).
   * @returns {number} Cantidad de mensajes enviados.
   */
  procesarPendientes(hoy = fechaLocal()) {
    const pendientes = this.recordatorioDAO.porEnviar(hoy, sumarDias(hoy, DIAS_ANTICIPACION));
    for (const r of pendientes) {
      transaccion(() => {
        const propietario = this.propietarios.obtenerPropietario(r.propietario_id);
        this.notificaciones.enviar(propietario, {
          canal: r.canal,
          tipo: 'recordatorio',
          asunto: `Recordatorio de ${r.tipo.toLowerCase()} de ${r.mascota_nombre} - ${r.fecha_programada}`,
          cuerpo: [
            `Hola ${propietario.nombre},`,
            '',
            `Le recordamos que ${r.mascota_nombre} tiene programada su ${r.tipo.toLowerCase()} (${r.descripcion}) para el ${r.fecha_programada}.`,
            '',
            'Confirme o cancele su asistencia desde el enlace de este mensaje.',
            'Clínica Veterinaria PetCare'
          ].join('\n'),
          enlace: `#/responder/${r.token}`
        });
        this.recordatorioDAO.marcarEnviado(r.id);
      });
    }
    return pendientes.length;
  }

  /**
   * Contrato: Datos de un recordatorio a partir del token del mensaje (sin iniciar sesión).
   * @param {string} token - Token del enlace.
   * @returns {Object} Datos mínimos para responder.
   * @throws {ErrorNegocio} 404 si el enlace no es válido.
   */
  consultarPorToken(token) {
    const r = this.recordatorioDAO.buscarPorToken(String(token));
    exigir(r, 'El enlace del recordatorio no es válido', 404);
    return {
      mascota: r.mascota_nombre,
      tipo: r.tipo,
      descripcion: r.descripcion,
      fechaProgramada: r.fecha_programada,
      estado: r.estado
    };
  }

  /**
   * Contrato: Confirma o cancela la asistencia desde el enlace del mensaje.
   * @param {string} token - Token del enlace.
   * @param {'confirmar'|'cancelar'} accion - Respuesta del cliente.
   * @returns {Object} Recordatorio actualizado.
   * @throws {ErrorNegocio} Si el enlace no es válido, la acción no existe o la fecha ya pasó.
   */
  responderPorToken(token, accion) {
    const r = this.recordatorioDAO.buscarPorToken(String(token));
    exigir(r, 'El enlace del recordatorio no es válido', 404);
    exigir(['confirmar', 'cancelar'].includes(accion), 'La respuesta debe ser confirmar o cancelar');
    exigir(r.fecha_programada >= fechaLocal(), 'La fecha del recordatorio ya pasó');
    this.recordatorioDAO.responder(r.id, accion === 'confirmar' ? ESTADOS.CONFIRMADO : ESTADOS.CANCELADO);
    return this.consultarPorToken(token);
  }

  /**
   * Contrato: Responde un recordatorio desde la sesión del cliente.
   * @param {number} id - Recordatorio.
   * @param {'confirmar'|'cancelar'} accion - Respuesta.
   * @param {Object} usuario - Cliente autenticado.
   * @returns {Object} Recordatorio actualizado.
   */
  responder(id, accion, usuario) {
    const r = this.recordatorioDAO.buscarPorId(Number(id));
    exigir(r, 'El recordatorio no existe', 404);
    this.propietarios.verificarAccesoMascota(usuario, r.mascota_id);
    this.responderPorToken(r.token, accion);
    return this.publico(this.recordatorioDAO.buscarPorId(r.id));
  }

  /**
   * Contrato: Lista recordatorios visibles para el usuario.
   * @param {Object} usuario - Usuario autenticado (el cliente solo ve los de sus mascotas).
   * @param {{mascotaId?: number, estado?: string}} filtros
   * @returns {Array<Object>} Recordatorios.
   */
  listar(usuario, { mascotaId, estado } = {}) {
    if (mascotaId) this.propietarios.verificarAccesoMascota(usuario, mascotaId);
    return this.recordatorioDAO.listar({
      mascotaId: mascotaId ? Number(mascotaId) : null,
      propietarioId: usuario.rol === 'cliente' ? (usuario.propietarioId || -1) : null,
      estado: estado || null
    }).map((r) => this.publico(r));
  }

  /** Datos de un recordatorio sin el token secreto. */
  publico(r) {
    const { token, ...resto } = r;
    return resto;
  }

  /**
   * Contrato: Programa recordatorios de ejemplo.
   * @param {Object} veterinario - Veterinario autor.
   */
  sembrar(veterinario) {
    if (!veterinario || this.recordatorioDAO.contar() > 0) return;
    const [max] = this.propietarios.buscarMascotas('Max');
    const [rocky] = this.propietarios.buscarMascotas('Rocky');
    if (max) this.programar({ mascotaId: max.id, tipo: 'Vacuna', descripcion: 'Antirrábica anual', fechaProgramada: sumarDias(fechaLocal(), 2) }, veterinario);
    if (rocky) this.programar({ mascotaId: rocky.id, tipo: 'Desparasitación', descripcion: 'Desparasitación trimestral', fechaProgramada: sumarDias(fechaLocal(), 20), canal: 'sms' }, veterinario);
  }
}

RecordatorioController.DIAS_ANTICIPACION = DIAS_ANTICIPACION;

module.exports = RecordatorioController;
