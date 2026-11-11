import { get, post } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, encabezado, fechaHora, insignia, listaDatos } from '../ui.js';

/**
 * HU-09: Registro y seguimiento de tratamientos.
 */
export default {
  id: 'tratamientos',
  titulo: 'Tratamientos',
  icono: 'pildora',
  descripcion: 'Seguimiento de tratamientos activos',

  async render(contenedor, ctx) {
    if (ctx.usuario.rol === 'cliente') return renderCliente(contenedor);
    const activos = await get('/tratamientos');
    reemplazar(contenedor,
      encabezado('Tratamientos activos', 'Pacientes con tratamientos en curso. Abra la ficha para registrar su evolución.'),
      h('div', { class: 'tarjeta' }, tabla([
        { titulo: 'Mascota', valor: (t) => h('a', { href: `#/mascotas/${t.mascotaId}/tratamientos` }, h('strong', {}, t.mascotaNombre)) },
        { titulo: 'Medicamento', valor: (t) => t.medicamento },
        { titulo: 'Dosis', valor: (t) => `${t.dosis} · ${t.frecuencia}` },
        { titulo: 'Duración', valor: (t) => t.duracion },
        { titulo: 'Inicio', valor: (t) => fechaHora(t.fechaInicio) },
        { titulo: 'Veterinario', valor: (t) => t.veterinarioNombre },
        { titulo: 'Evolución', valor: (t) => `${t.evoluciones.length} observación(es)` }
      ], activos, 'No hay tratamientos activos'))
    );
  }
};

async function renderCliente(contenedor) {
  const mascotas = await get('/mascotas');
  const resultados = await Promise.all(mascotas.map((m) => get(`/tratamientos?mascotaId=${m.id}`).then((r) => ({ mascota: m, ...r }))));
  reemplazar(contenedor,
    encabezado('Tratamientos de mis mascotas', 'Indicaciones de dosis y frecuencia de los tratamientos en curso.'),
    resultados.map(({ mascota, actuales }) => h('div', { class: 'tarjeta' },
      h('div', { class: 'titulo-pagina' }, h('h2', {}, mascota.nombre), h('a', { href: `#/mascotas/${mascota.id}/tratamientos` }, 'Ver todos')),
      actuales.length ? actuales.map((t) => tarjetaTratamiento(t)) : h('p', { class: 'vacio' }, 'Sin tratamientos activos')
    ))
  );
}

function tarjetaTratamiento(t, acciones = null) {
  return h('div', { class: 'evento', style: 'margin-bottom:1rem' },
    h('strong', {}, t.medicamento), ' ', insignia(t.estado, t.estado === 'Activo' ? 'alerta' : 'exito'),
    h('div', { class: 'meta' }, `Inicio ${fechaHora(t.fechaInicio)}${t.fechaFin ? ` · Fin ${fechaHora(t.fechaFin)}` : ''} · ${t.veterinarioNombre}`),
    listaDatos([
      ['Dosis', t.dosis],
      ['Frecuencia', t.frecuencia],
      ['Duración', t.duracion],
      ['Indicaciones', t.indicaciones]
    ]),
    t.evoluciones.length
      ? h('div', { style: 'margin-top:0.5rem' },
        h('div', { class: 'ayuda' }, 'Evolución:'),
        h('ul', { style: 'margin:0.25rem 0' }, t.evoluciones.map((e) => h('li', {},
          `${fechaHora(e.creadoEn)} · ${e.veterinarioNombre}: `, e.nota, e.finaliza ? ' ' : null, e.finaliza ? insignia('Finalización', 'exito') : null
        ))))
      : null,
    acciones
  );
}

/**
 * Pestaña "Tratamientos" de la ficha de la mascota.
 */
export const pestanaTratamientos = {
  id: 'tratamientos',
  titulo: 'Tratamientos',
  visible: (ctx) => ctx.puede('tratamientos'),
  async render(contenedor, mascota, ctx) {
    const { actuales, anteriores } = await get(`/tratamientos?mascotaId=${mascota.id}`);
    const esVeterinario = ctx.usuario.rol === 'veterinario';

    const nuevo = () => {
      const modal = abrirModal(`Nuevo tratamiento para ${mascota.nombre}`, formulario([
        { nombre: 'medicamento', etiqueta: 'Medicamento', requerido: true, ancho: 'completo' },
        { nombre: 'dosis', etiqueta: 'Dosis', requerido: true, placeholder: 'Ej: 1 tableta de 250 mg' },
        { nombre: 'frecuencia', etiqueta: 'Frecuencia', requerido: true, placeholder: 'Ej: Cada 12 horas' },
        { nombre: 'duracion', etiqueta: 'Duración', requerido: true, placeholder: 'Ej: 7 días' },
        { nombre: 'indicaciones', etiqueta: 'Indicaciones', tipo: 'textarea', ancho: 'completo' }
      ], async (datos) => {
        await post('/tratamientos', { ...datos, mascotaId: mascota.id });
        aviso('Tratamiento registrado', 'exito');
        modal.cerrar();
        ctx.recargar();
      }));
    };

    const evolucion = (t, finalizar) => {
      const modal = abrirModal(finalizar ? `Finalizar ${t.medicamento}` : `Evolución de ${t.medicamento}`, formulario([
        { nombre: 'nota', etiqueta: finalizar ? 'Observación de finalización' : 'Observación de la evolución', tipo: 'textarea', requerido: true, ancho: 'completo' }
      ], async (datos) => {
        await post(`/tratamientos/${t.id}/evolucion`, { ...datos, finalizar });
        aviso(finalizar ? 'Tratamiento finalizado' : 'Evolución registrada', 'exito');
        modal.cerrar();
        ctx.recargar();
      }, { textoBoton: finalizar ? 'Finalizar tratamiento' : 'Guardar observación' }));
    };

    reemplazar(contenedor, h('div', { class: 'rejilla-2' },
      h('div', { class: 'tarjeta' },
        h('div', { class: 'titulo-pagina' },
          h('h2', {}, `Tratamientos actuales (${actuales.length})`),
          esVeterinario ? h('button', { class: 'pequeno', onClick: nuevo }, '+ Nuevo tratamiento') : null
        ),
        actuales.length
          ? actuales.map((t) => tarjetaTratamiento(t, esVeterinario
            ? h('div', { class: 'acciones', style: 'margin-top:0.5rem' },
              h('button', { class: 'secundario pequeno', onClick: () => evolucion(t, false) }, 'Registrar evolución'),
              h('button', { class: 'pequeno', onClick: () => evolucion(t, true) }, 'Finalizar')
            )
            : null))
          : h('p', { class: 'vacio' }, 'Sin tratamientos activos')
      ),
      h('div', { class: 'tarjeta' },
        h('h2', {}, `Tratamientos anteriores (${anteriores.length})`),
        anteriores.length ? anteriores.map((t) => tarjetaTratamiento(t)) : h('p', { class: 'vacio' }, 'Sin tratamientos anteriores')
      )
    ));
  }
};
