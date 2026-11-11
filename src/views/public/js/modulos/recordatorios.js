import { get, post } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, insignia, encabezado, fecha, fechaHora, hoy } from '../ui.js';
import { icono, logotipo } from '../iconos.js';

const COLOR_ESTADO = { Pendiente: 'alerta', Confirmado: 'exito', Cancelado: 'peligro' };

/**
 * HU-03: Notificaciones automáticas de vacunación y desparasitación.
 */
export default {
  id: 'recordatorios',
  titulo: 'Recordatorios',
  icono: 'jeringa',
  descripcion: 'Vacunas y desparasitaciones programadas',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis recordatorios' : null),

  async render(contenedor, ctx) {
    const lista = await get('/recordatorios');
    const esCliente = ctx.usuario.rol === 'cliente';

    const procesar = async () => {
      try {
        const { enviados } = await post('/recordatorios/procesar');
        aviso(enviados ? `Se enviaron ${enviados} recordatorio(s)` : 'No hay recordatorios por enviar hoy', 'exito');
        ctx.recargar();
      } catch (error) {
        aviso(error.message, 'error');
      }
    };

    reemplazar(contenedor,
      encabezado(esCliente ? 'Mis recordatorios' : 'Recordatorios de vacunación y desparasitación',
        'El sistema envía el mensaje automáticamente 3 días antes de la fecha programada.',
        ctx.usuario.rol === 'administrador' ? h('button', { class: 'secundario', onClick: procesar }, 'Enviar pendientes ahora') : null
      ),
      h('div', { class: 'tarjeta' }, tablaRecordatorios(lista, ctx, true))
    );
  },

  async widgetInicio(ctx) {
    const lista = (await get('/recordatorios?estado=Pendiente')).filter((r) => r.fecha_programada >= hoy()).slice(0, 4);
    if (!lista.length) return null;
    return h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' }, h('h2', {}, 'Próximas vacunas y desparasitaciones'), h('a', { href: '#/recordatorios' }, 'Ver todos')),
      h('div', { class: 'linea-tiempo' }, lista.map((r) => h('div', { class: 'evento' },
        h('strong', {}, `${r.mascota_nombre}: ${r.descripcion}`),
        h('div', { class: 'meta' }, `${r.tipo} · ${fecha(r.fecha_programada)}${r.enviado_en ? ' · aviso enviado' : ''}`)
      )))
    );
  }
};

function tablaRecordatorios(lista, ctx, conMascota) {
  const esCliente = ctx.usuario.rol === 'cliente';
  const responder = async (r, accion) => {
    try {
      await post(`/recordatorios/${r.id}/responder`, { accion });
      aviso(accion === 'confirmar' ? 'Asistencia confirmada' : 'Asistencia cancelada', 'exito');
      ctx.recargar();
    } catch (error) {
      aviso(error.message, 'error');
    }
  };
  return tabla([
    { titulo: 'Fecha programada', valor: (r) => h('strong', {}, fecha(r.fecha_programada)) },
    conMascota ? { titulo: 'Mascota', valor: (r) => h('a', { href: `#/mascotas/${r.mascota_id}/historial` }, `${r.mascota_nombre} · ${r.propietario_nombre}`) } : null,
    { titulo: 'Tipo', valor: (r) => r.tipo },
    { titulo: 'Descripción', valor: (r) => r.descripcion },
    { titulo: 'Canal', valor: (r) => (r.canal === 'sms' ? 'SMS' : 'Correo') },
    { titulo: 'Aviso', valor: (r) => (r.enviado_en ? `Enviado ${fechaHora(r.enviado_en)}` : 'Se enviará 3 días antes') },
    { titulo: 'Estado', valor: (r) => insignia(r.estado, COLOR_ESTADO[r.estado]) },
    esCliente ? {
      titulo: 'Asistencia',
      valor: (r) => (r.estado === 'Pendiente' && r.fecha_programada >= hoy()
        ? h('div', { class: 'acciones' },
          h('button', { class: 'pequeno', onClick: () => responder(r, 'confirmar') }, 'Confirmar'),
          h('button', { class: 'pequeno peligro', onClick: () => responder(r, 'cancelar') }, 'Cancelar'))
        : '—')
    } : null
  ].filter(Boolean), lista, 'No hay recordatorios programados');
}

/**
 * Tarjeta de recordatorios de una mascota para la vista del historial clínico,
 * con el botón para que el veterinario programe el próximo recordatorio.
 * @param {Object} mascota - Mascota.
 * @param {Object} ctx - Contexto de la página.
 * @returns {Promise<HTMLElement|null>} Tarjeta o null si el rol no tiene acceso.
 */
export async function tarjetaRecordatoriosMascota(mascota, ctx) {
  if (!ctx.puede('recordatorios')) return null;
  const lista = await get(`/recordatorios?mascotaId=${mascota.id}`);

  const programar = () => {
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const modal = abrirModal(`Programar recordatorio para ${mascota.nombre}`, formulario([
      { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: [{ valor: 'Vacuna', texto: 'Vacuna' }, { valor: 'Desparasitación', texto: 'Desparasitación' }] },
      { nombre: 'fechaProgramada', etiqueta: 'Fecha programada', tipo: 'date', requerido: true, min: manana },
      { nombre: 'descripcion', etiqueta: 'Descripción', requerido: true, placeholder: 'Ej: Refuerzo antirrábica', ancho: 'completo' },
      { nombre: 'canal', etiqueta: 'Enviar por', tipo: 'select', opciones: [{ valor: 'correo', texto: 'Correo electrónico' }, { valor: 'sms', texto: 'SMS' }] }
    ], async (datos) => {
      await post('/recordatorios', { ...datos, mascotaId: mascota.id });
      aviso('Recordatorio programado. Se enviará 3 días antes de la fecha.', 'exito');
      modal.cerrar();
      ctx.recargar();
    }, { textoBoton: 'Programar' }));
  };

  return h('div', { class: 'tarjeta', style: 'grid-column:1 / -1' },
    h('div', { class: 'titulo-pagina' },
      h('h2', {}, 'Próximos recordatorios'),
      ctx.usuario.rol === 'veterinario' ? h('button', { class: 'pequeno', onClick: programar }, '+ Programar recordatorio') : null
    ),
    tablaRecordatorios(lista, ctx, false)
  );
}

/**
 * Página pública para responder un recordatorio desde el enlace del mensaje,
 * sin iniciar sesión (HU-03).
 * @param {HTMLElement} raiz - Contenedor de la aplicación.
 * @param {string} token - Token del enlace.
 */
export async function paginaResponder(raiz, token) {
  raiz.className = '';
  raiz.removeAttribute('aria-busy');
  document.title = 'Recordatorio · PetCare';
  const marca = () => h('div', { class: 'marca' }, logotipo(40), h('span', { class: 'marca-nombre' }, 'PetCare'));
  const caja = h('div', { class: 'tarjeta' }, marca(), h('p', { class: 'vacio', role: 'status' }, 'Cargando…'));
  reemplazar(raiz, h('main', { class: 'pantalla-centrada' }, caja));

  const pintar = (r, mensaje = null) => {
    reemplazar(caja,
      marca(),
      h('h1', { style: 'font-size:var(--t-lg)' }, `${r.tipo} de ${r.mascota}`),
      h('p', { style: 'margin:0 auto' }, `${r.descripcion} · ${fecha(r.fechaProgramada)}`),
      h('p', { style: 'margin:0 auto' }, insignia(r.estado, COLOR_ESTADO[r.estado])),
      mensaje ? h('div', { class: 'alerta exito', role: 'status' }, icono('correcto'), h('div', {}, mensaje)) : null,
      r.estado === 'Pendiente'
        ? h('div', { class: 'acciones', style: 'justify-content:center' },
          h('button', { class: 'accion', onClick: () => enviar('confirmar') }, 'Confirmar asistencia'),
          h('button', { class: 'secundario', onClick: () => enviar('cancelar') }, 'No podré asistir'))
        : null,
      h('a', { href: '#/inicio' }, 'Ir a PetCare')
    );
  };

  const enviar = async (accion) => {
    try {
      const r = await post(`/publico/recordatorios/${token}`, { accion });
      pintar(r, accion === 'confirmar' ? '¡Gracias! Su asistencia quedó confirmada.' : 'Su asistencia quedó cancelada.');
    } catch (error) {
      aviso(error.message, 'error');
    }
  };

  try {
    pintar(await get(`/publico/recordatorios/${token}`));
  } catch (error) {
    reemplazar(caja, marca(), h('div', { class: 'alerta peligro', role: 'alert' }, icono('alerta'), h('div', {}, error.message)));
  }
}
