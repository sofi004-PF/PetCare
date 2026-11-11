import { get, post } from '../api.js';
import { h, reemplazar, aviso, tabla, encabezado, listaDatos, fechaHora, botonVolver, botonIcono } from '../ui.js';
import { icono } from '../iconos.js';

/**
 * HU-06: Emisión de recetas médicas digitales.
 * Autocompleta paciente y veterinario, registra medicamento, dosis, frecuencia
 * y duración, genera el PDF y lo envía por correo o WhatsApp.
 */
export default {
  id: 'recetas',
  titulo: 'Recetas',
  icono: 'receta',
  descripcion: 'Recetas médicas en PDF',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis recetas' : null),

  async render(contenedor, ctx) {
    const [accion, mascotaId] = ctx.parametros;
    if (accion === 'nueva') return renderNueva(contenedor, ctx, mascotaId);
    if (accion) return renderDetalle(contenedor, accion);
    return renderLista(contenedor, ctx);
  }
};

function tablaRecetas(recetas, conMascota = true) {
  return tabla([
    { titulo: 'Número', valor: (r) => h('a', { href: `#/recetas/${r.id}` }, h('strong', {}, r.numero)) },
    { titulo: 'Fecha', valor: (r) => fechaHora(r.creado_en) },
    conMascota ? { titulo: 'Mascota', valor: (r) => `${r.mascota_nombre} · ${r.propietario_nombre}` } : null,
    { titulo: 'Medicamentos', valor: (r) => r.medicamentos.map((m) => m.medicamento).join(', ') },
    { titulo: 'Veterinario', valor: (r) => r.veterinario_nombre },
    { titulo: 'PDF', valor: (r) => h('a', { href: `/api/recetas/${r.id}/pdf`, target: '_blank', rel: 'noopener' }, 'Descargar') }
  ].filter(Boolean), recetas, 'No hay recetas emitidas');
}

async function renderLista(contenedor, ctx) {
  const recetas = await get('/recetas');
  reemplazar(contenedor,
    encabezado(ctx.usuario.rol === 'cliente' ? 'Mis recetas' : 'Recetas médicas', 'Recetas digitales emitidas, disponibles en PDF.',
      ctx.usuario.rol === 'veterinario' ? botonIcono('mas', 'Nueva receta', { class: 'accion', href: '#/recetas/nueva' }) : null
    ),
    h('div', { class: 'tarjeta' }, tablaRecetas(recetas))
  );
}

async function renderNueva(contenedor, ctx, mascotaId) {
  if (ctx.usuario.rol !== 'veterinario') {
    reemplazar(contenedor, h('div', { class: 'alerta info' }, 'Solo los veterinarios pueden emitir recetas.'));
    return;
  }
  if (!mascotaId) {
    const mascotas = await get('/mascotas');
    reemplazar(contenedor,
      encabezado('Nueva receta', 'Seleccione el paciente.', botonVolver('#/recetas')),
      h('div', { class: 'tarjeta' }, tabla([
        { titulo: 'Mascota', valor: (m) => h('strong', {}, m.nombre) },
        { titulo: 'Especie', valor: (m) => m.especie },
        { titulo: 'Propietario', valor: (m) => m.propietarioNombre },
        { titulo: '', valor: (m) => h('a', { class: 'boton pequeno', href: `#/recetas/nueva/${m.id}` }, 'Seleccionar') }
      ], mascotas))
    );
    return;
  }

  const datos = await get(`/recetas/autocompletar/${mascotaId}`);
  const filas = h('div', { style: 'display:flex;flex-direction:column;gap:0.75rem' });

  const agregarFila = () => {
    const fila = h('div', { class: 'formulario fila-medicamento', style: 'grid-template-columns:2fr 1fr 1fr 1fr auto;align-items:end' },
      h('div', { class: 'campo' }, h('label', {}, 'Medicamento *'), h('input', { name: 'medicamento', required: true })),
      h('div', { class: 'campo' }, h('label', {}, 'Dosis *'), h('input', { name: 'dosis', required: true, placeholder: 'Ej: 1 tableta' })),
      h('div', { class: 'campo' }, h('label', {}, 'Frecuencia *'), h('input', { name: 'frecuencia', required: true, placeholder: 'Cada 8 horas' })),
      h('div', { class: 'campo' }, h('label', {}, 'Duración *'), h('input', { name: 'duracion', required: true, placeholder: '5 días' })),
      h('button', { type: 'button', class: 'fantasma icono-solo', 'aria-label': 'Quitar medicamento', onClick: () => { if (filas.children.length > 1) fila.remove(); } }, icono('cerrar', { tamano: 18 }))
    );
    filas.append(fila);
  };
  agregarFila();

  const canal = h('select', { id: 'receta-canal' },
    h('option', { value: 'correo' }, `Correo (${datos.propietario.correo})`),
    h('option', { value: 'whatsapp' }, `WhatsApp (${datos.propietario.telefono})`)
  );
  const observaciones = h('textarea', { id: 'receta-observaciones', placeholder: 'Indicaciones adicionales para el cliente' });
  const boton = h('button', { type: 'submit', class: 'accion' }, 'Emitir y enviar receta');

  const form = h('form', {
    onSubmit: async (evento) => {
      evento.preventDefault();
      boton.disabled = true;
      try {
        const medicamentos = [...filas.querySelectorAll('.fila-medicamento')].map((f) => ({
          medicamento: f.querySelector('[name=medicamento]').value,
          dosis: f.querySelector('[name=dosis]').value,
          frecuencia: f.querySelector('[name=frecuencia]').value,
          duracion: f.querySelector('[name=duracion]').value
        }));
        const receta = await post('/recetas', { mascotaId: datos.paciente.id, canalEnvio: canal.value, observaciones: observaciones.value, medicamentos });
        aviso(`Receta ${receta.numero} emitida y enviada por ${canal.value === 'correo' ? 'correo' : 'WhatsApp'}`, 'exito');
        ctx.ir(`#/recetas/${receta.id}`);
      } catch (error) {
        aviso(error.message, 'error');
      } finally {
        boton.disabled = false;
      }
    }
  },
  h('div', { class: 'tarjeta' },
    h('div', { class: 'titulo-pagina' }, h('h2', {}, 'Medicamentos'), h('button', { type: 'button', class: 'secundario pequeno', onClick: agregarFila }, '+ Agregar medicamento')),
    filas
  ),
  h('div', { class: 'tarjeta formulario' },
    h('div', { class: 'campo' }, h('label', { for: 'receta-canal' }, 'Enviar al cliente por'), canal),
    h('div', { class: 'campo ancho-completo' }, h('label', { for: 'receta-observaciones' }, 'Indicaciones'), observaciones),
    h('div', { class: 'acciones ancho-completo' }, boton)
  ));

  reemplazar(contenedor,
    encabezado(`Receta para ${datos.paciente.nombre}`, 'Los datos del paciente y del veterinario se completan automáticamente.',
      botonVolver(`#/mascotas/${datos.paciente.id}/recetas`)
    ),
    h('div', { class: 'rejilla-2' },
      h('div', { class: 'tarjeta' }, h('h2', {}, 'Paciente'), listaDatos([
        ['Mascota', datos.paciente.nombre],
        ['Especie', `${datos.paciente.especie}${datos.paciente.raza ? ` · ${datos.paciente.raza}` : ''}`],
        ['Propietario', `${datos.propietario.nombre} (${datos.propietario.documento})`],
        ['Contacto', `${datos.propietario.correo} · ${datos.propietario.telefono}`]
      ])),
      h('div', { class: 'tarjeta' }, h('h2', {}, 'Veterinario que emite'), listaDatos([
        ['Nombre', datos.veterinario.nombre],
        ['Correo', datos.veterinario.correo]
      ]))
    ),
    form
  );
}

async function renderDetalle(contenedor, id) {
  const r = await get(`/recetas/${id}`);
  reemplazar(contenedor,
    encabezado(`Receta ${r.numero}`, `${r.mascota_nombre} · ${fechaHora(r.creado_en)}`,
      botonVolver(`#/mascotas/${r.mascota_id}/recetas`),
      botonIcono('descargar', 'Descargar PDF', { href: `/api/recetas/${r.id}/pdf`, target: '_blank', rel: 'noopener' })
    ),
    h('div', { class: 'tarjeta documento' },
      listaDatos([
        ['Paciente', `${r.mascota_nombre} (${r.mascota_especie})`],
        ['Propietario', `${r.propietario_nombre} · ${r.propietario_documento}`],
        ['Veterinario', r.veterinario_nombre],
        ['Enviada por', r.canal_envio === 'correo' ? `Correo a ${r.propietario_correo}` : `WhatsApp al ${r.propietario_telefono}`]
      ]),
      h('h2', { style: 'margin-top:1rem' }, 'Medicamentos'),
      tabla([
        { titulo: 'Medicamento', valor: (m) => h('strong', {}, m.medicamento) },
        { titulo: 'Dosis', valor: (m) => m.dosis },
        { titulo: 'Frecuencia', valor: (m) => m.frecuencia },
        { titulo: 'Duración', valor: (m) => m.duracion }
      ], r.medicamentos),
      r.observaciones ? h('p', { style: 'margin-top:1rem' }, h('strong', {}, 'Indicaciones: '), r.observaciones) : null
    )
  );
}

/**
 * Pestaña "Recetas" de la ficha de la mascota.
 */
export const pestanaRecetas = {
  id: 'recetas',
  titulo: 'Recetas',
  visible: (ctx) => ctx.puede('recetas'),
  async render(contenedor, mascota, ctx) {
    const recetas = await get(`/recetas?mascotaId=${mascota.id}`);
    reemplazar(contenedor, h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' },
        h('h2', {}, `Recetas (${recetas.length})`),
        ctx.usuario.rol === 'veterinario' ? h('a', { class: 'boton pequeno', href: `#/recetas/nueva/${mascota.id}` }, '+ Nueva receta') : null
      ),
      tablaRecetas(recetas, false)
    ));
  }
};
