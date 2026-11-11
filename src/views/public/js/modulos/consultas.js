import { get, post } from '../api.js';
import { h, reemplazar, aviso, formulario, tabla, encabezado, listaDatos, fechaHora, hoy, insignia } from '../ui.js';

/**
 * HU-08: Registro de consultas veterinarias.
 * El veterinario registra fecha (automática), motivo, síntomas, diagnóstico y
 * observaciones; la consulta queda asociada a la mascota y al veterinario.
 */
export default {
  id: 'consultas',
  titulo: 'Consultas',
  icono: '🩺',
  descripcion: 'Atención clínica de los pacientes',

  async render(contenedor, ctx) {
    const [accion, mascotaId, citaId] = ctx.parametros;
    if (accion === 'nueva') return renderNueva(contenedor, ctx, mascotaId, citaId);
    return renderLista(contenedor, ctx);
  }
};

async function renderLista(contenedor, ctx) {
  const esVeterinario = ctx.usuario.rol === 'veterinario';
  const filtroFecha = h('input', { type: 'date', value: hoy(), 'aria-label': 'Fecha de las consultas' });
  const resultados = h('div');
  const porAtender = h('div');

  const cargar = async () => {
    const consultas = await get(`/consultas?fecha=${filtroFecha.value}`);
    reemplazar(resultados, tabla([
      { titulo: 'Hora', valor: (c) => fechaHora(c.fecha) },
      { titulo: 'Mascota', valor: (c) => h('a', { href: `#/mascotas/${c.mascotaId}/consultas` }, c.mascotaNombre) },
      { titulo: 'Propietario', valor: (c) => c.propietarioNombre },
      { titulo: 'Veterinario', valor: (c) => c.veterinarioNombre },
      { titulo: 'Motivo', valor: (c) => c.motivo },
      { titulo: 'Diagnóstico', valor: (c) => c.diagnostico }
    ], consultas, 'No hay consultas registradas en esa fecha'));
  };
  filtroFecha.addEventListener('change', cargar);

  if (esVeterinario) {
    const citas = await get(`/citas?fecha=${hoy()}&veterinarioId=${ctx.usuario.id}&estado=Programada`);
    reemplazar(porAtender, h('div', { class: 'tarjeta' },
      h('h2', {}, 'Pacientes por atender hoy'),
      tabla([
        { titulo: 'Hora', valor: (c) => c.hora },
        { titulo: 'Mascota', valor: (c) => c.mascotaNombre },
        { titulo: 'Servicio', valor: (c) => c.servicioNombre },
        { titulo: 'Motivo', valor: (c) => c.motivo || '—' },
        { titulo: '', valor: (c) => h('a', { class: 'boton pequeno', href: `#/consultas/nueva/${c.mascotaId}/${c.id}` }, 'Atender') }
      ], citas, 'No tiene citas pendientes para hoy')
    ));
  }

  reemplazar(contenedor,
    encabezado('Consultas veterinarias', 'Registro de la atención clínica de cada paciente.',
      esVeterinario ? h('a', { class: 'boton', href: '#/consultas/nueva' }, '+ Registrar consulta') : null
    ),
    porAtender,
    h('div', { class: 'tarjeta' },
      h('div', { class: 'barra-filtros', style: 'margin-bottom:1rem' }, h('div', { class: 'campo' }, h('label', {}, 'Fecha'), filtroFecha)),
      resultados
    )
  );
  await cargar();
}

async function renderNueva(contenedor, ctx, mascotaId, citaId) {
  if (ctx.usuario.rol !== 'veterinario') {
    reemplazar(contenedor, h('div', { class: 'alerta info' }, 'Solo los veterinarios pueden registrar consultas.'));
    return;
  }
  if (!mascotaId) return renderSeleccionPaciente(contenedor, ctx);

  const [mascota, cita] = await Promise.all([
    get(`/mascotas/${mascotaId}`),
    citaId ? get(`/citas/${citaId}`) : Promise.resolve(null)
  ]);

  reemplazar(contenedor,
    encabezado(`Consulta de ${mascota.nombre}`, `${mascota.especie} · Dueño: ${mascota.propietarioNombre}`,
      h('a', { class: 'boton secundario', href: '#/consultas' }, '← Volver')
    ),
    h('div', { class: 'tarjeta' },
      h('p', { class: 'ayuda' }, `Veterinario responsable: ${ctx.usuario.nombre}. La fecha y hora se registran automáticamente al guardar.`),
      cita ? h('p', {}, 'Atendiendo la cita ', insignia(cita.codigo, 'info'), ` de las ${cita.hora} (${cita.servicioNombre}).`) : null,
      formulario([
        { nombre: 'motivo', etiqueta: 'Motivo de consulta', requerido: true, valor: cita?.motivo || cita?.servicioNombre || '', ancho: 'completo' },
        { nombre: 'sintomas', etiqueta: 'Síntomas', tipo: 'textarea', requerido: true, ancho: 'completo' },
        { nombre: 'pesoKg', etiqueta: 'Peso (kg)', tipo: 'number', paso: '0.1', min: '0' },
        { nombre: 'temperaturaC', etiqueta: 'Temperatura (°C)', tipo: 'number', paso: '0.1', min: '30', max: '45' },
        { nombre: 'diagnostico', etiqueta: 'Diagnóstico', tipo: 'textarea', requerido: true, ancho: 'completo' },
        { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' }
      ], async (datos) => {
        await post('/consultas', { ...datos, mascotaId: mascota.id, citaId: cita ? cita.id : null });
        aviso('Consulta registrada', 'exito');
        ctx.ir(`#/mascotas/${mascota.id}/consultas`);
      }, { textoBoton: 'Registrar consulta' })
    )
  );
}

async function renderSeleccionPaciente(contenedor, ctx) {
  const buscador = h('input', { type: 'search', placeholder: 'Nombre de la mascota o documento del dueño…', 'aria-label': 'Buscar paciente' });
  const resultados = h('div');
  const cargar = async () => {
    const mascotas = await get(`/mascotas?q=${encodeURIComponent(buscador.value.trim())}`);
    reemplazar(resultados, tabla([
      { titulo: 'Mascota', valor: (m) => h('strong', {}, m.nombre) },
      { titulo: 'Especie', valor: (m) => m.especie },
      { titulo: 'Propietario', valor: (m) => `${m.propietarioNombre} (${m.propietarioDocumento})` },
      { titulo: '', valor: (m) => h('a', { class: 'boton pequeno', href: `#/consultas/nueva/${m.id}` }, 'Seleccionar') }
    ], mascotas, 'No se encontraron pacientes'));
  };
  let temporizador;
  buscador.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(cargar, 250); });

  reemplazar(contenedor,
    encabezado('Registrar consulta', 'Busque al paciente que va a atender.', h('a', { class: 'boton secundario', href: '#/consultas' }, '← Volver')),
    h('div', { class: 'tarjeta' }, h('div', { class: 'barra-filtros', style: 'margin-bottom:1rem' }, buscador), resultados)
  );
  buscador.focus();
  await cargar();
}

/**
 * Pestaña "Consultas" de la ficha de la mascota: consultas anteriores.
 */
export const pestanaConsultas = {
  id: 'consultas',
  titulo: 'Consultas',
  visible: (ctx) => ctx.puede('consultas'),
  async render(contenedor, mascota, ctx) {
    const consultas = await get(`/consultas?mascotaId=${mascota.id}`);
    reemplazar(contenedor, h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' },
        h('h2', {}, `Consultas anteriores (${consultas.length})`),
        ctx.usuario.rol === 'veterinario' ? h('a', { class: 'boton pequeno', href: `#/consultas/nueva/${mascota.id}` }, '+ Registrar consulta') : null
      ),
      consultas.length
        ? h('div', { class: 'linea-tiempo' }, consultas.map((c) => h('div', { class: 'evento' },
          h('strong', {}, c.motivo),
          h('div', { class: 'meta' }, `${fechaHora(c.fecha)} · ${c.veterinarioNombre}`),
          listaDatos([
            ['Síntomas', c.sintomas],
            ['Diagnóstico', c.diagnostico],
            ['Observaciones', c.observaciones],
            ['Peso', c.pesoKg ? `${c.pesoKg} kg` : null],
            ['Temperatura', c.temperaturaC ? `${c.temperaturaC} °C` : null]
          ])
        )))
        : h('p', { class: 'vacio' }, `${mascota.nombre} aún no tiene consultas registradas.`)
    ));
  }
};
