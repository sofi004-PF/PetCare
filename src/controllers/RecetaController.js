const RecetaDAO = require('../dao/RecetaDAO');
const { generarPDF } = require('../utils/pdf');
const { exigir } = require('../utils/errores');
const { transaccion } = require('../dao/db');

const CANALES = { correo: 'correo electrónico', whatsapp: 'WhatsApp' };

/**
 * Fachada para la emisión de recetas médicas digitales (HU-06).
 * Autocompleta los datos del paciente y del veterinario, genera el PDF y lo
 * envía automáticamente al correo o al WhatsApp del cliente.
 */
class RecetaController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Datos del paciente y dueño.
   * @param {import('./NotificacionController')} notificacionController - Envío al cliente.
   */
  constructor(propietarioController, notificacionController) {
    this.recetaDAO = new RecetaDAO();
    this.propietarios = propietarioController;
    this.notificaciones = notificacionController;
  }

  /**
   * Contrato: Datos que la receta autocompleta antes de emitirla.
   * @param {number} mascotaId - Paciente.
   * @param {{nombre: string, correo: string}} veterinario - Veterinario que emite.
   * @returns {{paciente: Object, propietario: Object, veterinario: Object}} Datos autocompletados.
   */
  datosAutocompletados(mascotaId, veterinario) {
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    const propietario = this.propietarios.obtenerPropietario(mascota.propietarioId);
    return {
      paciente: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie, raza: mascota.raza, sexo: mascota.sexo },
      propietario: { nombre: propietario.nombre, documento: propietario.documento, correo: propietario.correo, telefono: propietario.telefono },
      veterinario: { nombre: veterinario.nombre, correo: veterinario.correo }
    };
  }

  /**
   * Contrato: Emite una receta, genera su PDF y la envía al cliente.
   * @param {{mascotaId: number, canalEnvio: 'correo'|'whatsapp', observaciones?: string,
   *          medicamentos: Array<{medicamento: string, dosis: string, frecuencia: string, duracion: string}>}} datos
   * @param {{id: number, rol: string}} veterinario - Veterinario que emite.
   * @returns {Object} Receta emitida.
   * @throws {ErrorNegocio} Si no hay medicamentos o falta un campo de algún medicamento.
   */
  emitir({ mascotaId, canalEnvio = 'correo', observaciones, medicamentos }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede emitir recetas', 403);
    exigir(CANALES[canalEnvio], 'El canal de envío debe ser correo o WhatsApp');
    exigir(Array.isArray(medicamentos) && medicamentos.length > 0, 'La receta debe tener al menos un medicamento');
    const limpios = medicamentos.map((m, i) => {
      const fila = {
        medicamento: String(m.medicamento || '').trim(),
        dosis: String(m.dosis || '').trim(),
        frecuencia: String(m.frecuencia || '').trim(),
        duracion: String(m.duracion || '').trim()
      };
      exigir(fila.medicamento && fila.dosis && fila.frecuencia && fila.duracion,
        `Complete nombre, dosis, frecuencia y duración del medicamento ${i + 1}`);
      return fila;
    });
    const mascota = this.propietarios.obtenerMascota(mascotaId);

    return transaccion(() => {
      const receta = this.recetaDAO.guardar({
        mascotaId: mascota.id,
        veterinarioId: veterinario.id,
        observaciones: observaciones ? String(observaciones).trim() : null,
        canalEnvio,
        medicamentos: limpios
      });
      const propietario = this.propietarios.obtenerPropietario(receta.propietario_id);
      this.notificaciones.enviar(propietario, {
        canal: canalEnvio,
        tipo: 'receta',
        asunto: `Receta médica ${receta.numero} de ${receta.mascota_nombre}`,
        cuerpo: [
          `Hola ${propietario.nombre},`,
          '',
          `${receta.veterinario_nombre} emitió la receta ${receta.numero} para ${receta.mascota_nombre}.`,
          '',
          ...receta.medicamentos.map((m) => `• ${m.medicamento}: ${m.dosis}, ${m.frecuencia}, durante ${m.duracion}`),
          receta.observaciones ? `\nIndicaciones: ${receta.observaciones}` : '',
          '',
          'Se adjunta la receta en PDF.',
          'Clínica Veterinaria PetCare'
        ].join('\n'),
        enlace: `/api/recetas/${receta.id}/pdf`
      });
      return receta;
    });
  }

  /**
   * Contrato: Lista recetas visibles para el usuario (el cliente solo ve las suyas).
   * @param {Object} usuario - Usuario autenticado.
   * @param {{mascotaId?: number}} filtros
   * @returns {Array<Object>} Recetas.
   */
  listar(usuario, { mascotaId } = {}) {
    if (mascotaId) {
      this.propietarios.verificarAccesoMascota(usuario, mascotaId);
      return this.recetaDAO.listar({ mascotaId: Number(mascotaId) });
    }
    return this.recetaDAO.listar({ propietarioId: usuario.rol === 'cliente' ? (usuario.propietarioId || -1) : null });
  }

  /**
   * Contrato: Consulta una receta.
   * @param {number} id - Receta.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {Object} Receta.
   */
  obtener(id, usuario) {
    const receta = this.recetaDAO.buscarPorId(Number(id));
    exigir(receta, 'La receta no existe', 404);
    this.propietarios.verificarAccesoMascota(usuario, receta.mascota_id);
    return receta;
  }

  /**
   * Contrato: Genera el PDF de una receta.
   * @param {number} id - Receta.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {{nombre: string, contenido: Buffer}} Archivo PDF.
   */
  generarPDF(id, usuario) {
    const r = this.obtener(id, usuario);
    const bloques = [
      { texto: 'Clínica Veterinaria PetCare', tamano: 18, negrita: true, color: 'marca' },
      { texto: 'Receta médica veterinaria', tamano: 12 },
      { separador: true },
      { columnas: [`Receta N.° ${r.numero}`, `Fecha: ${r.creado_en.slice(0, 16)}`], negrita: true, anchos: [250, 245] },
      { espacio: 6 },
      { texto: 'Paciente', negrita: true, color: 'marca' },
      { texto: `${r.mascota_nombre} · ${r.mascota_especie}${r.mascota_raza ? ` · ${r.mascota_raza}` : ''}` },
      { texto: `Propietario: ${r.propietario_nombre} · Documento ${r.propietario_documento}` },
      { texto: `Contacto: ${r.propietario_correo} · ${r.propietario_telefono}` },
      { espacio: 6 },
      { texto: 'Medicamentos', negrita: true, color: 'marca' },
      { columnas: ['Medicamento', 'Dosis', 'Frecuencia', 'Duración'], negrita: true, anchos: [175, 110, 120, 90] },
      ...r.medicamentos.map((m) => ({ columnas: [m.medicamento, m.dosis, m.frecuencia, m.duracion], anchos: [175, 110, 120, 90] })),
      { espacio: 6 }
    ];
    if (r.observaciones) bloques.push({ texto: 'Indicaciones', negrita: true, color: 'marca' }, { texto: r.observaciones }, { espacio: 6 });
    bloques.push(
      { espacio: 30 },
      { texto: '______________________________' },
      { texto: r.veterinario_nombre, negrita: true },
      { texto: 'Médico veterinario · Clínica Veterinaria PetCare', tamano: 9 }
    );
    return { nombre: `${r.numero}.pdf`, contenido: generarPDF(`Receta ${r.numero}`, bloques) };
  }

  /**
   * Contrato: Emite una receta de ejemplo.
   * @param {Object} veterinario - Veterinario autor.
   */
  sembrar(veterinario) {
    if (!veterinario || this.recetaDAO.listar().length > 0) return;
    const [luna] = this.propietarios.buscarMascotas('Luna');
    if (!luna) return;
    this.emitir({
      mascotaId: luna.id,
      canalEnvio: 'correo',
      observaciones: 'Administrar con alimento. Regresar a control en 8 días.',
      medicamentos: [{ medicamento: 'Amoxicilina 250 mg', dosis: '1/2 tableta', frecuencia: 'Cada 12 horas', duracion: '7 días' }]
    }, veterinario);
  }

  /**
   * Contrato: Eventos de recetas para el historial clínico (HU-02).
   * @param {number} mascotaId - Mascota.
   * @returns {Array<Object>} Eventos.
   */
  eventosHistorial(mascotaId) {
    return this.recetaDAO.listar({ mascotaId }).map((r) => ({
      tipo: 'Receta',
      fecha: r.creado_en,
      titulo: `Receta ${r.numero}`,
      detalle: r.medicamentos.map((m) => `${m.medicamento}: ${m.dosis}, ${m.frecuencia}, ${m.duracion}`).join('\n'),
      autor: r.veterinario_nombre
    }));
  }
}

module.exports = RecetaController;
