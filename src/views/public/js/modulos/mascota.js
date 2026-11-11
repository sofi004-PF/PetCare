import { get } from '../api.js';
import { h, reemplazar, encabezado } from '../ui.js';
import { PESTANAS_MASCOTA } from './pestanasMascota.js';

const ICONOS_ESPECIE = { Canino: '🐶', Felino: '🐱', Ave: '🐦', Roedor: '🐹', Reptil: '🦎', Otro: '🐾' };

/**
 * Ficha de una mascota (#/mascotas/:id/:pestaña). Reúne en pestañas la
 * información de los distintos módulos (datos, consultas, historial, etc.).
 */
export default {
  id: 'mascotas',
  titulo: 'Ficha de la mascota',
  icono: '🐾',
  oculto: true,
  menu: 'propietarios',

  async render(contenedor, ctx) {
    const [id, idPestana] = ctx.parametros;
    if (!id) {
      ctx.ir(ctx.usuario.rol === 'cliente' ? '#/propietarios' : '#/propietarios');
      return;
    }
    const mascota = await get(`/mascotas/${id}`);
    const pestanas = PESTANAS_MASCOTA.filter((p) => p.visible(ctx));
    const activa = pestanas.find((p) => p.id === idPestana) || pestanas[0];
    const area = h('div');

    reemplazar(contenedor,
      encabezado(`${ICONOS_ESPECIE[mascota.especie] || '🐾'} ${mascota.nombre}`,
        `${mascota.especie}${mascota.raza ? ` · ${mascota.raza}` : ''} · Dueño: ${mascota.propietarioNombre}`,
        h('a', { class: 'boton secundario', href: ctx.usuario.rol === 'cliente' ? '#/propietarios' : `#/propietarios/${mascota.propietarioId}` }, '← Volver')
      ),
      h('div', { class: 'pestanas', role: 'tablist' },
        pestanas.map((p) => h('button', {
          type: 'button',
          role: 'tab',
          class: p === activa ? 'activa' : '',
          'aria-selected': p === activa ? 'true' : 'false',
          onClick: () => ctx.ir(`#/mascotas/${mascota.id}/${p.id}`)
        }, p.titulo))
      ),
      area
    );
    await activa.render(area, mascota, ctx);
  }
};
