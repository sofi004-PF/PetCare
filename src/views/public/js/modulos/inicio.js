import { h, reemplazar } from '../ui.js';
import { icono } from '../iconos.js';
import { MODULOS } from './index.js';

/** Primer nombre sin títulos como "Dr." o "Dra.". */
function primerNombre(nombre) {
  const partes = String(nombre).split(' ').filter((p) => !/^(dr|dra|doc)\.?$/i.test(p));
  return partes[0] || nombre;
}

/**
 * Panel principal: saludo, avisos de los módulos y accesos directos.
 */
export default {
  id: 'inicio',
  titulo: 'Inicio',
  icono: 'inicio',

  async render(contenedor, ctx) {
    const permitidos = MODULOS.filter((m) => m.id !== 'inicio' && !m.oculto && ctx.puede(m.id));
    const widgets = h('div', { class: 'rejilla-2' });

    const fechaHoy = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

    reemplazar(contenedor,
      h('div', { class: 'titulo-pagina' },
        h('div', {},
          h('h1', {}, `Hola, ${primerNombre(ctx.usuario.nombre)}`),
          h('p', {}, `${fechaHoy.charAt(0).toUpperCase()}${fechaHoy.slice(1)} · ${ctx.usuario.nombreRol}`)
        )
      ),
      widgets,
      h('section', { 'aria-labelledby': 'titulo-accesos', style: 'display:flex;flex-direction:column;gap:1rem' },
        h('h2', { id: 'titulo-accesos' }, 'Accesos rápidos'),
        h('div', { class: 'rejilla' },
          permitidos.map((m) => h('a', { class: 'tarjeta acceso', href: `#/${m.id}` },
            h('span', { class: 'icono-caja' }, icono(m.icono)),
            h('span', {}, h('strong', {}, (m.tituloPara && m.tituloPara(ctx.usuario.rol)) || m.titulo), m.descripcion ? h('span', { class: 'ayuda' }, m.descripcion) : null)
          ))
        )
      )
    );

    // Cada módulo puede aportar un resumen al panel (citas de hoy, alertas de stock, etc.)
    const resultados = await Promise.allSettled(
      permitidos.filter((m) => typeof m.widgetInicio === 'function').map((m) => m.widgetInicio(ctx))
    );
    for (const resultado of resultados) {
      if (resultado.status !== 'fulfilled' || !resultado.value) continue;
      // Las alertas (por ejemplo, stock bajo) se muestran primero
      if (resultado.value.classList.contains('alerta')) widgets.prepend(resultado.value);
      else widgets.append(resultado.value);
    }
  }
};
