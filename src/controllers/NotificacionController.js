const NotificacionDAO = require('../dao/NotificacionDAO');

const CANALES = ['correo', 'sms', 'whatsapp'];

/**
 * Fachada de notificaciones a clientes. En este prototipo los mensajes no
 * salen a un servidor de correo real: se registran en la bandeja de salida
 * (tabla notificaciones) con su canal, destinatario y estado, lo que permite
 * verificarlos desde la página.
 */
class NotificacionController {
  constructor() {
    this.notificacionDAO = new NotificacionDAO();
  }

  /**
   * Contrato: Envía (registra) un mensaje a un propietario.
   * @param {Object} propietario - Destinatario con {id, correo, telefono}.
   * @param {{canal?: string, tipo: string, asunto: string, cuerpo: string, enlace?: string}} mensaje
   * @returns {Object} Notificación registrada.
   */
  enviar(propietario, { canal = 'correo', tipo, asunto, cuerpo, enlace = null }) {
    const canalValido = CANALES.includes(canal) ? canal : 'correo';
    const destinatario = canalValido === 'correo' ? propietario.correo : propietario.telefono;
    return this.notificacionDAO.guardar({ propietarioId: propietario.id, destinatario, canal: canalValido, tipo, asunto, cuerpo, enlace });
  }

  /**
   * Contrato: Lista las notificaciones visibles para un usuario.
   * El cliente solo ve las suyas; el personal ve todas.
   * @param {{rol: string, propietarioId: number|null}} usuario - Usuario autenticado.
   * @param {{tipo?: string}} [filtros] - Filtro por tipo.
   * @returns {Array<Object>} Notificaciones.
   */
  listar(usuario, { tipo = null } = {}) {
    const propietarioId = usuario.rol === 'cliente' ? (usuario.propietarioId || -1) : null;
    return this.notificacionDAO.listar({ propietarioId, tipo: tipo || null });
  }

  /**
   * Contrato: Indica si ya se envió una notificación (evita duplicados).
   * @param {string} tipo - Tipo.
   * @param {string} enlace - Referencia única.
   * @returns {boolean} true si ya se envió.
   */
  yaEnviada(tipo, enlace) {
    return this.notificacionDAO.existe(tipo, enlace);
  }
}

module.exports = NotificacionController;
