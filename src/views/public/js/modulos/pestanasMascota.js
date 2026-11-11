import { get, put } from '../api.js';
import { h, reemplazar, aviso, abrirModal, listaDatos, fecha } from '../ui.js';
import { formularioMascota } from './propietarios.js';
import { pestanaCitas } from './citas.js';
import { pestanaConsultas } from './consultas.js';
import { pestanaHistorial } from './historial.js';
import { pestanaTratamientos } from './tratamientos.js';

/**
 * Pestañas de la ficha de una mascota. Cada historia de usuario agrega aquí
 * su pestaña: { id, titulo, visible(ctx), render(contenedor, mascota, ctx) }.
 */
export const PESTANAS_MASCOTA = [
  {
    id: 'datos',
    titulo: 'Datos',
    visible: () => true,
    async render(contenedor, mascota, ctx) {
      const editar = async () => {
        const especies = await get('/propietarios/especies');
        const modal = abrirModal('Editar mascota', formularioMascota(especies, mascota, async (datos) => {
          await put(`/mascotas/${mascota.id}`, datos);
          aviso('Datos de la mascota actualizados', 'exito');
          modal.cerrar();
          ctx.recargar();
        }));
      };
      reemplazar(contenedor, h('div', { class: 'tarjeta' },
        h('div', { class: 'titulo-pagina' },
          h('h2', {}, 'Datos del paciente'),
          h('button', { class: 'secundario pequeno', onClick: editar }, 'Editar')
        ),
        listaDatos([
          ['Nombre', mascota.nombre],
          ['Especie', mascota.especie],
          ['Raza', mascota.raza],
          ['Sexo', mascota.sexo],
          ['Fecha de nacimiento', fecha(mascota.fechaNacimiento)],
          ['Edad', calcularEdad(mascota.fechaNacimiento)],
          ['Propietario', `${mascota.propietarioNombre} (${mascota.propietarioDocumento})`]
        ])
      ));
    }
  },
  pestanaHistorial,
  pestanaConsultas,
  pestanaTratamientos,
  pestanaCitas
];

/**
 * @param {string} fechaNacimiento - AAAA-MM-DD.
 * @returns {string} Edad aproximada en años y meses.
 */
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—';
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const ahora = new Date();
  let meses = (ahora.getFullYear() - nacimiento.getFullYear()) * 12 + (ahora.getMonth() - nacimiento.getMonth());
  if (ahora.getDate() < nacimiento.getDate()) meses -= 1;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return `${resto} ${resto === 1 ? 'mes' : 'meses'}`;
  return `${anios} ${anios === 1 ? 'año' : 'años'}${resto ? ` y ${resto} ${resto === 1 ? 'mes' : 'meses'}` : ''}`;
}
