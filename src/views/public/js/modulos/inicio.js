import { h, reemplazar } from '../ui.js';
import { MODULOS } from './index.js';

/**
 * Panel principal: saludo, avisos de los módulos y accesos directos.
 */
export default {
  id: 'inicio',
  titulo: 'Inicio',
  icono: '🏠',

  async render(contenedor, ctx) {
    const permitidos = MODULOS.filter((m) => m.id !== 'inicio' && !m.oculto && ctx.puede(m.id));
    const widgets = h('div', { class: 'rejilla-2' });

    reemplazar(contenedor,
      h('div', { class: 'titulo-pagina' },
        h('div', {},
          h('h1', {}, `Hola, ${ctx.usuario.nombre.split(' ')[0]} 👋`),
          h('p', {}, `Ingresó como ${ctx.usuario.nombreRol}.`)
        )
      ),
      widgets,
      h('h2', {}, 'Accesos rápidos'),
      h('div', { class: 'rejilla' },
        permitidos.map((m) => h('a', { class: 'tarjeta acceso', href: `#/${m.id}` },
          h('span', { class: 'icono', 'aria-hidden': 'true' }, m.icono),
          h('div', {}, h('strong', {}, (m.tituloPara && m.tituloPara(ctx.usuario.rol)) || m.titulo), m.descripcion ? h('div', { class: 'ayuda' }, m.descripcion) : null)
        ))
      )
    );

    // Cada módulo puede aportar un resumen al panel (citas de hoy, alertas de stock, etc.)
    const resultados = await Promise.allSettled(
      permitidos.filter((m) => typeof m.widgetInicio === 'function').map((m) => m.widgetInicio(ctx))
    );
    for (const resultado of resultados) {
      if (resultado.status === 'fulfilled' && resultado.value) widgets.append(resultado.value);
    }
  }
};
