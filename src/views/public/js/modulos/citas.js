import { get, post, put } from '../api.js';
import {
  h, reemplazar, aviso, abrirModal, tabla, insignia, encabezado, listaDatos, fecha, moneda, hoy, confirmar,
  botonVolver, botonIcono, nuevoId, validarContenedor, marcarCampo, mensajeValidacion
} from '../ui.js';
import { icono } from '../iconos.js';

export const PUEDEN_AGENDAR = ['administrador', 'recepcionista', 'cliente'];
const COLOR_ESTADO = { Programada: 'info', Atendida: 'exito', Cancelada: 'peligro' };
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * HU-01: Agendamiento de citas médicas en línea.
 * Calendario de disponibilidad por veterinario, tipo de servicio con costo
 * estimado, confirmación por correo, cancelación y reprogramación.
 */
export default {
  id: 'citas',
  titulo: 'Citas',
  icono: 'calendario',
  descripcion: 'Agenda y reservas en línea',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis citas' : rol === 'veterinario' ? 'Mi agenda' : null),

  async render(contenedor, ctx) {
    const [accion] = ctx.parametros;
    if (accion === 'nueva') return renderAgendar(contenedor, ctx);
    if (accion) return renderDetalle(contenedor, ctx, accion);
    return renderLista(contenedor, ctx);
  },

  async widgetInicio(ctx) {
    const filtros = ctx.usuario.rol === 'cliente' ? `desde=${hoy()}&estado=Programada` : `fecha=${hoy()}`;
    const veterinario = ctx.usuario.rol === 'veterinario' ? `&veterinarioId=${ctx.usuario.id}` : '';
    const citas = await get(`/citas?${filtros}${veterinario}`);
    const titulo = ctx.usuario.rol === 'cliente' ? 'Mis próximas citas' : 'Citas de hoy';
    return h('section', { class: 'tarjeta', 'aria-label': titulo },
      h('div', { class: 'titulo-pagina' }, h('h2', {}, titulo), h('a', { href: '#/citas' }, 'Ver agenda')),
      citas.length
        ? h('div', { class: 'linea-tiempo' }, citas.slice(0, 5).map((c) => h('div', { class: 'evento' },
          h('strong', {}, `${c.hora} · ${c.mascotaNombre}`), ' ', insignia(c.estado, COLOR_ESTADO[c.estado]),
          h('div', { class: 'meta' }, `${fecha(c.fecha)} · ${c.servicioNombre} · ${c.veterinarioNombre}`)
        )))
        : h('p', { class: 'vacio' }, ctx.usuario.rol === 'cliente' ? 'No tiene citas próximas. Agende una con el botón "Agendar cita".' : 'No hay citas para hoy.')
    );
  }
};

async function renderLista(contenedor, ctx) {
  const esPersonal = ['administrador', 'recepcionista'].includes(ctx.usuario.rol);
  const veterinarios = await get('/usuarios/veterinarios');
  const resultados = h('div');
  const ids = { fecha: nuevoId('f'), vet: nuevoId('f'), estado: nuevoId('f') };

  const filtroFecha = h('input', { id: ids.fecha, type: 'date', value: ctx.usuario.rol === 'cliente' ? '' : hoy() });
  const filtroVet = h('select', { id: ids.vet },
    h('option', { value: '' }, 'Todos los veterinarios'),
    veterinarios.map((v) => h('option', { value: v.id, selected: ctx.usuario.rol === 'veterinario' && v.id === ctx.usuario.id }, v.nombre))
  );
  const filtroEstado = h('select', { id: ids.estado },
    h('option', { value: '' }, 'Todos los estados'),
    Object.keys(COLOR_ESTADO).map((e) => h('option', { value: e }, e))
  );

  const cargar = async () => {
    const parametros = new URLSearchParams();
    if (filtroFecha.value) parametros.set('fecha', filtroFecha.value);
    if (filtroVet.value) parametros.set('veterinarioId', filtroVet.value);
    if (filtroEstado.value) parametros.set('estado', filtroEstado.value);
    const citas = await get(`/citas?${parametros}`);
    reemplazar(resultados, tabla([
      { titulo: 'Fecha', valor: (c) => h('a', { href: `#/citas/${c.id}` }, `${fecha(c.fecha)} ${c.hora}`) },
      { titulo: 'Código', valor: (c) => c.codigo },
      { titulo: 'Mascota', valor: (c) => h('a', { href: `#/mascotas/${c.mascotaId}` }, c.mascotaNombre) },
      { titulo: 'Propietario', valor: (c) => c.propietarioNombre },
      { titulo: 'Servicio', valor: (c) => c.servicioNombre },
      { titulo: 'Veterinario', valor: (c) => c.veterinarioNombre },
      { titulo: 'Estado', valor: (c) => insignia(c.estado, COLOR_ESTADO[c.estado]) },
      { titulo: '', valor: (c) => accionesCita(c, ctx) }
    ], citas, filtroFecha.value ? 'No hay citas ese día con esos filtros.' : 'No hay citas con esos filtros.'));
  };

  [filtroFecha, filtroVet, filtroEstado].forEach((control) => control.addEventListener('change', cargar));

  reemplazar(contenedor,
    encabezado(ctx.usuario.rol === 'cliente' ? 'Mis citas' : 'Agenda de citas',
      esPersonal ? 'Citas de todos los veterinarios. Cambie la fecha para ver otro día.' : 'Consulte, cancele o reprograme sus citas.',
      PUEDEN_AGENDAR.includes(ctx.usuario.rol) ? botonIcono('mas', 'Agendar cita', { class: 'accion', onClick: () => abrirAgendarCita(ctx) }) : null
    ),
    h('div', { class: 'tarjeta' },
      h('div', { class: 'barra-filtros no-imprimir', style: 'margin-bottom:1rem' },
        h('div', { class: 'campo' }, h('label', { for: ids.fecha }, 'Fecha'), filtroFecha),
        h('div', { class: 'campo' }, h('label', { for: ids.vet }, 'Veterinario'), filtroVet),
        h('div', { class: 'campo' }, h('label', { for: ids.estado }, 'Estado'), filtroEstado),
        h('button', { class: 'secundario', onClick: () => { filtroFecha.value = ''; cargar(); } }, 'Ver todas las fechas')
      ),
      resultados
    )
  );
  await cargar();
}

function accionesCita(cita, ctx) {
  if (cita.estado === 'Programada' && ctx.usuario.rol === 'veterinario' && ctx.puede('consultas')) {
    return h('a', { class: 'boton pequeno', href: `#/consultas/nueva/${cita.mascotaId}/${cita.id}` }, 'Atender');
  }
  if (cita.estado !== 'Programada' || !PUEDEN_AGENDAR.includes(ctx.usuario.rol)) return '—';
  return h('div', { class: 'acciones' },
    h('button', { class: 'secundario pequeno', onClick: () => abrirReprogramar(cita, ctx) }, 'Reprogramar'),
    h('button', {
      class: 'fantasma pequeno',
      style: 'color:var(--color-peligro)',
      onClick: async () => {
        if (!confirmar(`¿Cancelar la cita ${cita.codigo} de ${cita.mascotaNombre}? El horario quedará libre para otra persona.`)) return;
        try {
          await post(`/citas/${cita.id}/cancelar`);
          aviso('Cita cancelada. El horario quedó disponible.', 'exito');
          ctx.recargar();
        } catch (error) {
          aviso(error.message, 'error');
        }
      }
    }, 'Cancelar cita')
  );
}

/**
 * Calendario de días y horarios disponibles de un veterinario.
 * Los botones usan aria-pressed para indicar el día y la hora elegidos.
 * @param {number} veterinarioId - Veterinario.
 * @param {(seleccion: {fecha: string, hora: string}) => void} alElegir - Acción al elegir horario.
 * @returns {Promise<HTMLElement>} Calendario.
 */
async function calendario(veterinarioId, alElegir) {
  const dias = await get(`/citas/disponibilidad?veterinarioId=${veterinarioId}`);
  const horarios = h('div', { class: 'acciones', role: 'group', 'aria-label': 'Horarios del día', style: 'margin-top:1rem' },
    h('p', { class: 'ayuda' }, 'Seleccione un día para ver sus horarios.'));

  const botonesDia = dias.map((dia) => {
    const fechaDia = new Date(`${dia.fecha}T12:00:00`);
    const nombreDia = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(fechaDia);
    const boton = h('button', {
      type: 'button',
      class: 'secundario dia-calendario',
      disabled: !dia.laboral || dia.disponibles === 0,
      'aria-pressed': 'false',
      'aria-label': dia.laboral ? `${nombreDia}, ${dia.disponibles} horarios libres` : `${nombreDia}, cerrado`,
      onClick: () => {
        botonesDia.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        boton.setAttribute('aria-pressed', 'true');
        alElegir({ fecha: '', hora: '' });
        reemplazar(horarios, dia.horarios.map((hr) => h('button', {
          type: 'button',
          class: 'secundario pequeno hora-calendario',
          disabled: !hr.disponible,
          'aria-pressed': 'false',
          'aria-label': `${hr.hora}${hr.disponible ? '' : ', ocupado'}`,
          onClick: (evento) => {
            horarios.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
            evento.currentTarget.setAttribute('aria-pressed', 'true');
            alElegir({ fecha: dia.fecha, hora: hr.hora });
          }
        }, hr.hora)));
      }
    },
    h('span', { class: 'ayuda' }, DIAS[fechaDia.getDay()]),
    h('strong', {}, String(fechaDia.getDate())),
    h('span', { class: 'ayuda' }, dia.laboral ? `${dia.disponibles} libres` : 'Cerrado'));
    return boton;
  });

  return h('div', {},
    h('div', { class: 'acciones', role: 'group', 'aria-label': 'Días disponibles' }, botonesDia),
    horarios
  );
}

/**
 * Formulario completo para agendar una cita (se usa en la página y en el modal).
 * @param {HTMLElement} contenedor - Dónde dibujarlo.
 * @param {Object} ctx - Contexto de la página.
 * @param {{mascotaId?: string, alAgendar: (cita: Object) => void}} opciones
 */
async function montarAgendar(contenedor, ctx, { mascotaId = '', alAgendar }) {
  const [servicios, veterinarios, mascotas] = await Promise.all([
    get('/citas/servicios'), get('/usuarios/veterinarios'), get('/mascotas')
  ]);
  const seleccion = { mascotaId: String(mascotaId || ''), servicioId: '', veterinarioId: '', fecha: '', hora: '', motivo: '' };
  const ids = { mascota: nuevoId('cita'), servicio: nuevoId('cita'), vet: nuevoId('cita'), motivo: nuevoId('cita'), horario: nuevoId('cita') };

  const zonaCalendario = h('div', { id: ids.horario, tabindex: '-1' }, h('p', { class: 'ayuda' }, 'Elija un veterinario para ver sus días y horarios disponibles.'));
  const errorHorario = h('p', { class: 'error-campo', role: 'alert', hidden: true }, icono('alerta', { tamano: 14 }), 'Elija un día y una hora disponibles.');
  const resumen = h('div');
  const boton = h('button', { type: 'submit', class: 'accion' }, 'Confirmar cita');

  const actualizarResumen = () => {
    const servicio = servicios.find((s) => String(s.id) === seleccion.servicioId);
    const mascota = mascotas.find((m) => String(m.id) === seleccion.mascotaId);
    const veterinario = veterinarios.find((v) => String(v.id) === seleccion.veterinarioId);
    reemplazar(resumen, listaDatos([
      ['Mascota', mascota ? mascota.nombre : '—'],
      ['Servicio', servicio ? servicio.nombre : '—'],
      ['Veterinario', veterinario ? veterinario.nombre : '—'],
      ['Fecha y hora', seleccion.fecha ? `${fecha(seleccion.fecha)} a las ${seleccion.hora}` : '—'],
      ['Costo estimado', servicio ? h('strong', {}, moneda(servicio.precio)) : '—']
    ]));
  };

  const cargarCalendario = async () => {
    seleccion.fecha = '';
    seleccion.hora = '';
    reemplazar(zonaCalendario, h('p', { class: 'ayuda', role: 'status' }, 'Cargando disponibilidad…'));
    reemplazar(zonaCalendario, await calendario(seleccion.veterinarioId, ({ fecha: f, hora }) => {
      seleccion.fecha = f;
      seleccion.hora = hora;
      if (f) errorHorario.hidden = true;
      actualizarResumen();
    }));
    actualizarResumen();
  };

  const selectMascota = h('select', { id: ids.mascota, name: 'mascotaId', required: true, onChange: (e) => { seleccion.mascotaId = e.target.value; actualizarResumen(); } },
    h('option', { value: '' }, mascotas.length ? 'Seleccione la mascota…' : 'No hay mascotas registradas'),
    mascotas.map((m) => h('option', { value: m.id, selected: String(m.id) === seleccion.mascotaId },
      m.propietarioNombre ? `${m.nombre} (${m.especie}) · ${m.propietarioNombre}` : `${m.nombre} (${m.especie})`))
  );
  const selectServicio = h('select', { id: ids.servicio, name: 'servicioId', required: true, onChange: (e) => { seleccion.servicioId = e.target.value; actualizarResumen(); } },
    h('option', { value: '' }, 'Seleccione el servicio…'),
    servicios.map((s) => h('option', { value: s.id }, `${s.nombre} · ${moneda(s.precio)}`))
  );
  const selectVet = h('select', { id: ids.vet, name: 'veterinarioId', required: true, onChange: (e) => { seleccion.veterinarioId = e.target.value; if (e.target.value) cargarCalendario(); } },
    h('option', { value: '' }, 'Seleccione el veterinario…'),
    veterinarios.map((v) => h('option', { value: v.id }, v.nombre))
  );
  const motivo = h('textarea', { id: ids.motivo, name: 'motivo', placeholder: 'Ej: control anual, vómito, refuerzo de vacuna', onInput: (e) => { seleccion.motivo = e.target.value; } });

  const etiqueta = (id, texto, obligatorio) => h('label', { for: id }, texto, obligatorio ? h('span', { class: 'obligatorio', 'aria-hidden': 'true' }, '*') : null);

  const form = h('form', {
    class: 'formulario',
    noValidate: true,
    onInput: (e) => { if (e.target.getAttribute('aria-invalid') === 'true') marcarCampo(e.target, mensajeValidacion(e.target)); },
    onChange: (e) => { if (e.target.getAttribute('aria-invalid') === 'true') marcarCampo(e.target, mensajeValidacion(e.target)); },
    onSubmit: async (evento) => {
      evento.preventDefault();
      const camposValidos = validarContenedor(form);
      errorHorario.hidden = Boolean(seleccion.fecha && seleccion.hora);
      if (!camposValidos) return;
      if (!seleccion.fecha || !seleccion.hora) {
        zonaCalendario.focus();
        return;
      }
      boton.disabled = true;
      try {
        const cita = await post('/citas', seleccion);
        aviso(`Cita agendada con el código ${cita.codigo}. Le enviamos un correo de confirmación.`, 'exito');
        alAgendar(cita);
      } catch (error) {
        aviso(error.message, 'error');
        if (seleccion.veterinarioId) cargarCalendario();
      } finally {
        boton.disabled = false;
      }
    }
  },
  h('div', { class: 'campo ancho-completo' }, etiqueta(ids.mascota, 'Mascota', true), selectMascota),
  h('div', { class: 'campo' }, etiqueta(ids.servicio, 'Tipo de servicio', true), selectServicio),
  h('div', { class: 'campo' }, etiqueta(ids.vet, 'Veterinario', true), selectVet),
  h('fieldset', { class: 'ancho-completo', style: 'border:0;padding:0;margin:0;min-width:0' },
    h('legend', { style: 'font-size:var(--t-sm);font-weight:600;margin-bottom:0.5rem' }, 'Día y hora', h('span', { class: 'obligatorio', 'aria-hidden': 'true' }, '*')),
    zonaCalendario,
    errorHorario
  ),
  h('div', { class: 'campo ancho-completo' }, etiqueta(ids.motivo, 'Motivo de la cita', false), motivo),
  h('div', { class: 'ancho-completo tarjeta', style: 'background:var(--pizarra-50)' },
    h('h3', { style: 'margin-bottom:0.75rem' }, 'Resumen de la reserva'),
    resumen,
    h('div', { class: 'acciones', style: 'margin-top:1rem' }, boton)
  ));

  reemplazar(contenedor, form);
  actualizarResumen();
}

/**
 * Abre el agendamiento de citas en una ventana modal.
 * @param {Object} ctx - Contexto de la página.
 * @param {{mascotaId?: string}} [opciones] - Mascota preseleccionada.
 */
export function abrirAgendarCita(ctx, { mascotaId = '' } = {}) {
  const cuerpo = h('div', {}, h('p', { class: 'vacio', role: 'status' }, 'Cargando…'));
  const modal = abrirModal('Agendar cita', cuerpo, { amplio: true });
  montarAgendar(cuerpo, ctx, {
    mascotaId,
    alAgendar: (cita) => {
      modal.cerrar();
      ctx.ir(`#/citas/${cita.id}`);
    }
  }).then(() => {
    const primero = cuerpo.querySelector('select');
    if (primero) primero.focus();
  }).catch((error) => reemplazar(cuerpo, h('div', { class: 'alerta peligro' }, icono('alerta'), h('div', {}, error.message))));
}

async function renderAgendar(contenedor, ctx) {
  if (!PUEDEN_AGENDAR.includes(ctx.usuario.rol)) {
    reemplazar(contenedor, h('div', { class: 'alerta info' }, 'Las citas las agenda el cliente o el personal administrativo.'));
    return;
  }
  const zona = h('div', { class: 'tarjeta' });
  reemplazar(contenedor,
    encabezado('Agendar cita', 'Elija la mascota, el tipo de servicio y un horario disponible.', botonVolver('#/citas')),
    zona
  );
  await montarAgendar(zona, ctx, { mascotaId: ctx.parametros[1], alAgendar: (cita) => ctx.ir(`#/citas/${cita.id}`) });
}

function abrirReprogramar(cita, ctx) {
  const contenido = h('div', {}, h('p', {}, `Elija el nuevo horario con ${cita.veterinarioNombre}.`));
  const modal = abrirModal(`Reprogramar cita ${cita.codigo}`, contenido, { amplio: true });
  calendario(cita.veterinarioId, async ({ fecha: f, hora }) => {
    if (!f) return;
    if (!confirmar(`¿Mover la cita al ${fecha(f)} a las ${hora}?`)) return;
    try {
      await put(`/citas/${cita.id}/reprogramar`, { fecha: f, hora });
      aviso('Cita reprogramada', 'exito');
      modal.cerrar();
      ctx.recargar();
    } catch (error) {
      aviso(error.message, 'error');
    }
  }).then((cal) => contenido.append(cal));
}

async function renderDetalle(contenedor, ctx, id) {
  const cita = await get(`/citas/${id}`);
  reemplazar(contenedor,
    encabezado(`Cita ${cita.codigo}`, `${cita.mascotaNombre} · ${fecha(cita.fecha)} a las ${cita.hora}`, botonVolver('#/citas')),
    h('div', { class: 'tarjeta' },
      listaDatos([
        ['Código de reserva', h('strong', {}, cita.codigo)],
        ['Estado', insignia(cita.estado, COLOR_ESTADO[cita.estado])],
        ['Mascota', h('a', { href: `#/mascotas/${cita.mascotaId}` }, cita.mascotaNombre)],
        ['Propietario', cita.propietarioNombre],
        ['Servicio', cita.servicioNombre],
        ['Veterinario', cita.veterinarioNombre],
        ['Fecha y hora', `${fecha(cita.fecha)} ${cita.hora}`],
        ['Costo estimado', moneda(cita.costo)],
        ['Motivo', cita.motivo]
      ]),
      h('div', { style: 'margin-top:1rem' }, accionesCita(cita, ctx))
    )
  );
}

/**
 * Pestaña "Citas" de la ficha de la mascota.
 */
export const pestanaCitas = {
  id: 'citas',
  titulo: 'Citas',
  visible: (ctx) => ctx.puede('citas'),
  async render(contenedor, mascota, ctx) {
    const citas = await get(`/citas?mascotaId=${mascota.id}`);
    reemplazar(contenedor, h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' },
        h('h2', {}, 'Citas de la mascota'),
        PUEDEN_AGENDAR.includes(ctx.usuario.rol)
          ? botonIcono('mas', 'Agendar', { class: 'accion pequeno', onClick: () => abrirAgendarCita(ctx, { mascotaId: mascota.id }) })
          : null
      ),
      tabla([
        { titulo: 'Fecha', valor: (c) => h('a', { href: `#/citas/${c.id}` }, `${fecha(c.fecha)} ${c.hora}`) },
        { titulo: 'Servicio', valor: (c) => c.servicioNombre },
        { titulo: 'Veterinario', valor: (c) => c.veterinarioNombre },
        { titulo: 'Estado', valor: (c) => insignia(c.estado, COLOR_ESTADO[c.estado]) }
      ], citas, 'Sin citas registradas')
    ));
  }
};
