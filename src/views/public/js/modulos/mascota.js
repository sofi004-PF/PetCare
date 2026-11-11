import { get } from '../api.js';
import { h, reemplazar, encabezado, botonVolver } from '../ui.js';
import { PESTANAS_MASCOTA } from './pestanasMascota.js';


/**
 * Ficha de una mascota (#/mascotas/:id/:pestaña). Reúne en pestañas la
 * información de los distintos módulos (datos, consultas, historial, etc.).
 */
export default {
  id: 'mascotas',
  titulo: 'Ficha de la mascota',
  icono: 'huella',
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
      encabezado(mascota.nombre,
        `${mascota.especie}${mascota.raza ? ` · ${mascota.raza}` : ''} · Dueño: ${mascota.propietarioNombre}`,
        botonVolver(ctx.usuario.rol === 'cliente' ? '#/propietarios' : `#/propietarios/${mascota.propietarioId}`)
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
