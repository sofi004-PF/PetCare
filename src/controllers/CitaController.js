const crypto = require('crypto');
const CitaDAO = require('../dao/CitaDAO');
const UsuarioDAO = require('../dao/UsuarioDAO');
const Cita = require('../models/Cita');
const { AGENDA, horariosDelDia } = require('../config/agenda');
const { exigir, exigirCampos } = require('../utils/errores');
const { fechaLocal, horaLocal, sumarDias, diaSemana, esFechaValida } = require('../utils/fechas');
const { transaccion } = require('../dao/db');

/**
 * Fachada para el agendamiento de citas médicas (HU-01).
 * Reglas: horario laboral, sin fechas pasadas, sin dos citas del mismo
 * veterinario en el mismo horario, el cliente solo agenda para sus mascotas,
 * y se envía un correo de confirmación con el código de reserva.
 */
class CitaController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Para validar mascotas y dueños.
   * @param {import('./NotificacionController')} notificacionController - Para enviar la confirmación.
   */
  constructor(propietarioController, notificacionController) {
    this.citaDAO = new CitaDAO();
    this.usuarioDAO = new UsuarioDAO();
    this.propietarios = propietarioController;
    this.notificaciones = notificacionController;
  }

  /**
   * Contrato: Lista los tipos de servicio con su costo.
   * @returns {Array<Object>} Servicios (consulta general, vacunación, urgencia).
   */
  listarServicios() {
    return this.citaDAO.listarServicios();
  }

  /**
   * Contrato: Calendario de disponibilidad de un veterinario para los próximos días.
   * @param {number} veterinarioId - Veterinario.
   * @param {string} [desde] - Fecha inicial (por defecto hoy).
   * @returns {Array<{fecha: string, laboral: boolean, horarios: Array<{hora: string, disponible: boolean}>, disponibles: number}>}
   * @throws {ErrorNegocio} Si el veterinario no existe.
   */
  disponibilidad(veterinarioId, desde = null) {
    this.obtenerVeterinario(veterinarioId);
    const inicio = desde && esFechaValida(desde) && desde > fechaLocal() ? desde : fechaLocal();
    const fin = sumarDias(inicio, AGENDA.diasVisibles - 1);
    const ocupados = new Set(this.citaDAO.horariosOcupados(Number(veterinarioId), inicio, fin).map((o) => `${o.fecha} ${o.hora}`));
    const hoy = fechaLocal();
    const ahora = horaLocal();

    const dias = [];
    for (let i = 0; i < AGENDA.diasVisibles; i += 1) {
      const fecha = sumarDias(inicio, i);
      const laboral = AGENDA.diasLaborales.includes(diaSemana(fecha));
      const horarios = laboral
        ? horariosDelDia().map((hora) => ({
          hora,
          disponible: !ocupados.has(`${fecha} ${hora}`) && !(fecha === hoy && hora <= ahora)
        }))
        : [];
      dias.push({ fecha, laboral, horarios, disponibles: horarios.filter((h) => h.disponible).length });
    }
    return dias;
  }

  /**
   * Contrato: Agenda una cita y envía el correo de confirmación.
   * @param {{mascotaId: number, veterinarioId: number, servicioId: number, fecha: string, hora: string, motivo?: string}} datos
   * @param {Object} usuario - Usuario que agenda (cliente o personal).
   * @returns {Cita} Cita creada con su código de reserva.
   * @throws {ErrorNegocio} Si el horario no es válido o ya está ocupado.
   */
  agendar({ mascotaId, veterinarioId, servicioId, fecha, hora, motivo }, usuario) {
    exigirCampos({ mascotaId, veterinarioId, servicioId, fecha, hora },
      { mascotaId: 'mascota', veterinarioId: 'veterinario', servicioId: 'tipo de servicio', fecha: 'fecha', hora: 'hora' });
    const mascota = this.propietarios.verificarAccesoMascota(usuario, mascotaId);
    const veterinario = this.obtenerVeterinario(veterinarioId);
    const servicio = this.citaDAO.buscarServicio(Number(servicioId));
    exigir(servicio, 'El tipo de servicio no existe', 404);
    this.validarHorario(veterinario.id, fecha, hora);

    const cita = transaccion(() => {
      const nueva = this.citaDAO.guardar({
        codigo: this.generarCodigo(),
        mascotaId: mascota.id,
        veterinarioId: veterinario.id,
        servicioId: servicio.id,
        fecha,
        hora,
        motivo: motivo ? String(motivo).trim() : null,
        costo: servicio.precio,
        creadoPor: usuario.id
      });
      this.notificar(nueva, 'Confirmación de cita', `Su cita quedó agendada con el código de reserva ${nueva.codigo}.`);
      return nueva;
    });
    return cita;
  }

  /**
   * Contrato: Cancela una cita programada y libera el horario.
   * @param {number} id - Cita.
   * @param {Object} usuario - Usuario que cancela.
   * @returns {Cita} Cita cancelada.
   * @throws {ErrorNegocio} Si la cita no está programada o el cliente no es su dueño.
   */
  cancelar(id, usuario) {
    const cita = this.obtenerConAcceso(id, usuario);
    exigir(cita.estado === Cita.ESTADOS.PROGRAMADA, `No se puede cancelar una cita en estado ${cita.estado}`);
    const cancelada = this.citaDAO.cambiarEstado(cita.id, Cita.ESTADOS.CANCELADA);
    this.notificar(cancelada, 'Cita cancelada', `La cita ${cancelada.codigo} fue cancelada. El horario quedó disponible.`);
    return cancelada;
  }

  /**
   * Contrato: Cambia la fecha, hora o veterinario de una cita programada.
   * @param {number} id - Cita.
   * @param {{fecha: string, hora: string, veterinarioId?: number}} datos - Nuevo horario.
   * @param {Object} usuario - Usuario que reprograma.
   * @returns {Cita} Cita reprogramada.
   * @throws {ErrorNegocio} Si el nuevo horario no está disponible.
   */
  reprogramar(id, { fecha, hora, veterinarioId }, usuario) {
    const cita = this.obtenerConAcceso(id, usuario);
    exigir(cita.estado === Cita.ESTADOS.PROGRAMADA, `No se puede reprogramar una cita en estado ${cita.estado}`);
    exigirCampos({ fecha, hora }, { fecha: 'fecha', hora: 'hora' });
    const veterinario = this.obtenerVeterinario(veterinarioId || cita.veterinarioId);
    this.validarHorario(veterinario.id, fecha, hora, cita.id);
    const reprogramada = this.citaDAO.reprogramar(cita.id, { fecha, hora, veterinarioId: veterinario.id });
    this.notificar(reprogramada, 'Cita reprogramada', `La cita ${reprogramada.codigo} cambió de horario.`);
    return reprogramada;
  }

  /**
   * Contrato: Marca una cita como atendida (lo usa el registro de consultas).
   * @param {number} id - Cita.
   * @returns {Cita} Cita atendida.
   */
  marcarAtendida(id) {
    const cita = this.citaDAO.buscarPorId(Number(id));
    exigir(cita, 'La cita no existe', 404);
    exigir(cita.estado !== Cita.ESTADOS.CANCELADA, 'La cita está cancelada');
    return this.citaDAO.cambiarEstado(cita.id, Cita.ESTADOS.ATENDIDA);
  }

  /**
   * Contrato: Lista citas visibles para el usuario. El cliente ve las suyas
   * y el veterinario, por defecto, su propia agenda.
   * @param {Object} usuario - Usuario autenticado.
   * @param {{fecha?: string, desde?: string, veterinarioId?: number, estado?: string, mascotaId?: number}} filtros
   * @returns {Array<Cita>} Citas.
   */
  listar(usuario, filtros = {}) {
    const limpios = {
      fecha: filtros.fecha || null,
      desde: filtros.desde || null,
      veterinarioId: filtros.veterinarioId ? Number(filtros.veterinarioId) : null,
      estado: filtros.estado || null,
      mascotaId: filtros.mascotaId ? Number(filtros.mascotaId) : null,
      propietarioId: null
    };
    if (usuario.rol === 'cliente') limpios.propietarioId = usuario.propietarioId || -1;
    if (limpios.mascotaId) this.propietarios.verificarAccesoMascota(usuario, limpios.mascotaId);
    return this.citaDAO.listar(limpios);
  }

  /**
   * Contrato: Consulta una cita respetando la propiedad del cliente.
   * @param {number} id - Cita.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {Cita} Cita.
   */
  obtenerConAcceso(id, usuario) {
    const cita = this.citaDAO.buscarPorId(Number(id));
    exigir(cita, 'La cita no existe', 404);
    if (usuario.rol === 'cliente') {
      exigir(cita.propietarioId === usuario.propietarioId, 'Solo puede gestionar sus propias citas', 403);
    }
    return cita;
  }

  validarHorario(veterinarioId, fecha, hora, excluirId = null) {
    exigir(esFechaValida(fecha), 'La fecha no es válida');
    exigir(fecha >= fechaLocal(), 'No se pueden agendar citas en fechas pasadas');
    exigir(AGENDA.diasLaborales.includes(diaSemana(fecha)), 'La clínica no atiende ese día (horario de lunes a sábado)');
    exigir(horariosDelDia().includes(hora), 'La hora no corresponde a un horario de atención');
    exigir(!(fecha === fechaLocal() && hora <= horaLocal()), 'Esa hora ya pasó');
    exigir(!this.citaDAO.estaOcupado(veterinarioId, fecha, hora, excluirId),
      'El veterinario ya tiene una cita en ese horario. Elija otro horario.', 409);
  }

  obtenerVeterinario(id) {
    const veterinario = this.usuarioDAO.buscarPorId(Number(id));
    exigir(veterinario && veterinario.rol === 'veterinario' && veterinario.activo, 'El veterinario no existe o no está activo', 404);
    return veterinario;
  }

  generarCodigo() {
    return `PC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  notificar(cita, asunto, introduccion) {
    const propietario = this.propietarios.obtenerPropietario(cita.propietarioId);
    this.notificaciones.enviar(propietario, {
      canal: 'correo',
      tipo: 'cita',
      asunto: `${asunto} - ${cita.codigo}`,
      cuerpo: [
        `Hola ${propietario.nombre},`,
        '',
        introduccion,
        '',
        `Mascota: ${cita.mascotaNombre}`,
        `Servicio: ${cita.servicioNombre}`,
        `Veterinario: ${cita.veterinarioNombre}`,
        `Fecha y hora: ${cita.fecha} a las ${cita.hora}`,
        `Costo estimado: $${Number(cita.costo).toLocaleString('es-CO')} COP`,
        '',
        'Clínica Veterinaria PetCare'
      ].join('\n'),
      enlace: `#/citas/${cita.id}`
    });
  }

  /**
   * Contrato: Carga los servicios y algunas citas de prueba.
   */
  sembrar() {
    if (this.citaDAO.contarServicios() === 0) {
      this.citaDAO.guardarServicio({ nombre: 'Consulta general', descripcion: 'Valoración médica general del paciente', precio: 60000 });
      this.citaDAO.guardarServicio({ nombre: 'Vacunación', descripcion: 'Aplicación de vacunas del esquema', precio: 45000 });
      this.citaDAO.guardarServicio({ nombre: 'Urgencia', descripcion: 'Atención prioritaria', precio: 120000 });
    }
    if (this.citaDAO.contar() > 0) return;
    const [vet1, vet2] = this.usuarioDAO.obtenerPorRol('veterinario');
    const mascotas = this.propietarios.buscarMascotas('');
    const recepcion = this.usuarioDAO.obtenerPorRol('recepcionista')[0];
    if (!vet1 || mascotas.length < 3 || !recepcion) return;

    // Próximos días laborales para las citas de ejemplo
    const laborales = [];
    for (let i = 1; laborales.length < 3; i += 1) {
      const fecha = sumarDias(fechaLocal(), i);
      if (AGENDA.diasLaborales.includes(diaSemana(fecha))) laborales.push(fecha);
    }
    const personal = { id: recepcion.id, rol: 'recepcionista' };
    this.agendar({ mascotaId: mascotas[0].id, veterinarioId: vet1.id, servicioId: 1, fecha: laborales[0], hora: '09:00', motivo: 'Control anual' }, personal);
    this.agendar({ mascotaId: mascotas[1].id, veterinarioId: vet1.id, servicioId: 2, fecha: laborales[0], hora: '10:30', motivo: 'Refuerzo de vacuna' }, personal);
    this.agendar({ mascotaId: mascotas[2].id, veterinarioId: (vet2 || vet1).id, servicioId: 1, fecha: laborales[1], hora: '15:00', motivo: 'Pérdida de apetito' }, personal);
  }
}

module.exports = CitaController;
