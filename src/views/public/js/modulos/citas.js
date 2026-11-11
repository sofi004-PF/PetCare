import { get, post, put } from '../api.js';
import { h, reemplazar, aviso, abrirModal, tabla, insignia, encabezado, listaDatos, fecha, moneda, hoy, confirmar } from '../ui.js';

const PUEDEN_AGENDAR = ['administrador', 'recepcionista', 'cliente'];
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
  icono: '📅',
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
    return h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' }, h('h2', {}, `📅 ${titulo}`), h('a', { href: '#/citas' }, 'Ver agenda')),
      citas.length
        ? h('div', { class: 'linea-tiempo' }, citas.slice(0, 5).map((c) => h('div', { class: 'evento' },
          h('strong', {}, `${c.hora} · ${c.mascotaNombre}`), ' ', insignia(c.estado, COLOR_ESTADO[c.estado]),
          h('div', { class: 'meta' }, `${fecha(c.fecha)} · ${c.servicioNombre} · ${c.veterinarioNombre}`)
        )))
        : h('p', { class: 'vacio' }, 'No hay citas programadas')
    );
  }
};

async function renderLista(contenedor, ctx) {
  const esPersonal = ['administrador', 'recepcionista'].includes(ctx.usuario.rol);
  const veterinarios = await get('/usuarios/veterinarios');
  const resultados = h('div');

  const filtroFecha = h('input', { type: 'date', value: ctx.usuario.rol === 'cliente' ? '' : hoy(), 'aria-label': 'Fecha' });
  const filtroVet = h('select', { 'aria-label': 'Veterinario' },
    h('option', { value: '' }, 'Todos los veterinarios'),
    veterinarios.map((v) => h('option', { value: v.id, selected: ctx.usuario.rol === 'veterinario' && v.id === ctx.usuario.id }, v.nombre))
  );
  const filtroEstado = h('select', { 'aria-label': 'Estado' },
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
      { titulo: 'Acciones', valor: (c) => accionesCita(c, ctx) }
    ], citas, 'No hay citas con esos filtros'));
  };

  [filtroFecha, filtroVet, filtroEstado].forEach((control) => control.addEventListener('change', cargar));

  reemplazar(contenedor,
    encabezado(ctx.usuario.rol === 'cliente' ? 'Mis citas' : 'Agenda de citas',
      esPersonal ? 'Citas de todos los veterinarios. Use los filtros para ver otro día.' : 'Consulte, cancele o reprograme sus citas.',
      PUEDEN_AGENDAR.includes(ctx.usuario.rol) ? h('a', { class: 'boton', href: '#/citas/nueva' }, '+ Agendar cita') : null
    ),
    h('div', { class: 'tarjeta' },
      h('div', { class: 'barra-filtros', style: 'margin-bottom:1rem' },
        h('div', { class: 'campo' }, h('label', {}, 'Fecha'), filtroFecha),
        h('div', { class: 'campo' }, h('label', {}, 'Veterinario'), filtroVet),
        h('div', { class: 'campo' }, h('label', {}, 'Estado'), filtroEstado),
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
      class: 'peligro pequeno',
      onClick: async () => {
        if (!confirmar(`¿Cancelar la cita ${cita.codigo} de ${cita.mascotaNombre}?`)) return;
        try {
          await post(`/citas/${cita.id}/cancelar`);
          aviso('Cita cancelada. El horario quedó disponible.', 'exito');
          ctx.recargar();
        } catch (error) {
          aviso(error.message, 'error');
        }
      }
    }, 'Cancelar')
  );
}

/**
 * Calendario de días y horarios disponibles de un veterinario.
 * @param {number} veterinarioId - Veterinario.
 * @param {(seleccion: {fecha: string, hora: string}) => void} alElegir - Acción al elegir horario.
 * @returns {Promise<HTMLElement>} Calendario.
 */
async function calendario(veterinarioId, alElegir) {
  const dias = await get(`/citas/disponibilidad?veterinarioId=${veterinarioId}`);
  const horarios = h('div', { class: 'acciones', style: 'margin-top:1rem' }, h('p', { class: 'ayuda' }, 'Seleccione un día para ver sus horarios.'));

  const botonesDia = dias.map((dia) => {
    const fechaDia = new Date(`${dia.fecha}T12:00:00`);
    const boton = h('button', {
      type: 'button',
      class: 'secundario',
      disabled: !dia.laboral || dia.disponibles === 0,
      style: 'flex-direction:column;min-width:76px;gap:0',
      title: dia.laboral ? `${dia.disponibles} horarios libres` : 'No laboral',
      onClick: () => {
        botonesDia.forEach((b) => { b.style.borderColor = ''; });
        boton.style.borderColor = 'var(--color-primario)';
        reemplazar(horarios, dia.horarios.map((hr) => h('button', {
          type: 'button',
          class: 'secundario pequeno',
          disabled: !hr.disponible,
          title: hr.disponible ? 'Disponible' : 'Ocupado',
          onClick: (evento) => {
            horarios.querySelectorAll('button').forEach((b) => { b.style.background = ''; b.style.color = ''; });
            evento.currentTarget.style.background = 'var(--color-primario)';
            evento.currentTarget.style.color = '#fff';
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

  return h('div', {}, h('div', { class: 'acciones' }, botonesDia), horarios);
}

async function renderAgendar(contenedor, ctx) {
  const [servicios, veterinarios, mascotas] = await Promise.all([
    get('/citas/servicios'), get('/usuarios/veterinarios'), get('/mascotas')
  ]);
  const seleccion = { mascotaId: ctx.parametros[1] || '', servicioId: '', veterinarioId: '', fecha: '', hora: '', motivo: '' };
  const zonaCalendario = h('div', {}, h('p', { class: 'ayuda' }, 'Elija un veterinario para ver su calendario.'));
  const resumen = h('div');

  const actualizarResumen = () => {
    const servicio = servicios.find((s) => String(s.id) === String(seleccion.servicioId));
    const mascota = mascotas.find((m) => String(m.id) === String(seleccion.mascotaId));
    const veterinario = veterinarios.find((v) => String(v.id) === String(seleccion.veterinarioId));
    const completo = servicio && mascota && veterinario && seleccion.fecha && seleccion.hora;
    reemplazar(resumen, h('div', { class: 'tarjeta' },
      h('h2', {}, 'Resumen de la reserva'),
      listaDatos([
        ['Mascota', mascota ? mascota.nombre : '—'],
        ['Servicio', servicio ? servicio.nombre : '—'],
        ['Veterinario', veterinario ? veterinario.nombre : '—'],
        ['Fecha y hora', seleccion.fecha ? `${fecha(seleccion.fecha)} ${seleccion.hora || ''}` : '—'],
        ['Costo estimado', servicio ? h('strong', {}, moneda(servicio.precio)) : '—']
      ]),
      h('div', { class: 'acciones', style: 'margin-top:1rem' },
        h('button', { disabled: !completo, onClick: confirmarReserva }, 'Confirmar cita')
      )
    ));
  };

  async function confirmarReserva(evento) {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      const cita = await post('/citas', seleccion);
      aviso(`Cita agendada. Código de reserva ${cita.codigo}. Se envió un correo de confirmación.`, 'exito');
      ctx.ir(`#/citas/${cita.id}`);
    } catch (error) {
      aviso(error.message, 'error');
      boton.disabled = false;
      if (seleccion.veterinarioId) cargarCalendario();
    }
  }

  const cargarCalendario = async () => {
    seleccion.fecha = '';
    seleccion.hora = '';
    reemplazar(zonaCalendario, await calendario(seleccion.veterinarioId, ({ fecha: f, hora }) => {
      seleccion.fecha = f;
      seleccion.hora = hora;
      actualizarResumen();
    }));
    actualizarResumen();
  };

  const selectMascota = h('select', { id: 'cita-mascota', required: true, onChange: (e) => { seleccion.mascotaId = e.target.value; actualizarResumen(); } },
    h('option', { value: '' }, mascotas.length ? 'Seleccione la mascota…' : 'No hay mascotas registradas'),
    mascotas.map((m) => h('option', { value: m.id, selected: String(m.id) === String(seleccion.mascotaId) },
      m.propietarioNombre ? `${m.nombre} (${m.especie}) · ${m.propietarioNombre}` : `${m.nombre} (${m.especie})`))
  );
  const selectServicio = h('select', { id: 'cita-servicio', required: true, onChange: (e) => { seleccion.servicioId = e.target.value; actualizarResumen(); } },
    h('option', { value: '' }, 'Seleccione el servicio…'),
    servicios.map((s) => h('option', { value: s.id }, `${s.nombre} · ${moneda(s.precio)}`))
  );
  const selectVet = h('select', { id: 'cita-veterinario', required: true, onChange: (e) => { seleccion.veterinarioId = e.target.value; if (e.target.value) cargarCalendario(); } },
    h('option', { value: '' }, 'Seleccione el veterinario…'),
    veterinarios.map((v) => h('option', { value: v.id }, v.nombre))
  );
  const motivo = h('textarea', { id: 'cita-motivo', placeholder: 'Ej: control anual, vómito, refuerzo de vacuna…', onInput: (e) => { seleccion.motivo = e.target.value; } });

  reemplazar(contenedor,
    encabezado('Agendar cita', 'Elija la mascota, el tipo de servicio y un horario disponible.',
      h('a', { class: 'boton secundario', href: '#/citas' }, '← Volver')
    ),
    h('div', { class: 'rejilla-2' },
      h('div', { class: 'tarjeta' },
        h('form', { class: 'formulario', onSubmit: (e) => e.preventDefault() },
          h('div', { class: 'campo ancho-completo' }, h('label', { for: 'cita-mascota' }, 'Mascota *'), selectMascota),
          h('div', { class: 'campo' }, h('label', { for: 'cita-servicio' }, 'Tipo de servicio *'), selectServicio),
          h('div', { class: 'campo' }, h('label', { for: 'cita-veterinario' }, 'Veterinario *'), selectVet),
          h('div', { class: 'campo ancho-completo' }, h('label', { for: 'cita-motivo' }, 'Motivo de la cita'), motivo)
        )
      ),
      resumen
    ),
    h('div', { class: 'tarjeta' }, h('h2', {}, 'Calendario de disponibilidad'), zonaCalendario)
  );
  actualizarResumen();
}

function abrirReprogramar(cita, ctx) {
  const contenido = h('div', {}, h('p', {}, `Elija el nuevo horario con ${cita.veterinarioNombre}.`));
  const modal = abrirModal(`Reprogramar cita ${cita.codigo}`, contenido);
  calendario(cita.veterinarioId, async ({ fecha: f, hora }) => {
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
    encabezado(`Cita ${cita.codigo}`, `${cita.mascotaNombre} · ${fecha(cita.fecha)} a las ${cita.hora}`,
      h('a', { class: 'boton secundario', href: '#/citas' }, '← Volver')
    ),
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
        PUEDEN_AGENDAR.includes(ctx.usuario.rol) ? h('a', { class: 'boton pequeno', href: `#/citas/nueva/${mascota.id}` }, '+ Agendar') : null
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
