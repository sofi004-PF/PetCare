/**
 * Registro de módulos de la página, en el orden en que aparecen en el menú.
 * Cada módulo exporta: { id, titulo, icono, render(contenedor, ctx), widgetInicio?(ctx) }.
 * El menú solo muestra los módulos que el rol del usuario tiene permitidos.
 */
import inicio from './inicio.js';
import citas from './citas.js';
import propietarios from './propietarios.js';
import mascota from './mascota.js';
import notificaciones from './notificaciones.js';
import usuarios from './usuarios.js';

export const MODULOS = [
  inicio,
  citas,
  propietarios,
  mascota,
  notificaciones,
  usuarios
];
