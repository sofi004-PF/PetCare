/**
 * Registro de módulos de la página, en el orden en que aparecen en el menú.
 * Cada módulo exporta: { id, titulo, icono, render(contenedor, ctx), widgetInicio?(ctx) }.
 * El menú solo muestra los módulos que el rol del usuario tiene permitidos.
 */
import inicio from './inicio.js';
import citas from './citas.js';
import consultas from './consultas.js';
import historial from './historial.js';
import tratamientos from './tratamientos.js';
import recetas from './recetas.js';
import recordatorios from './recordatorios.js';
import inventario from './inventario.js';
import facturas from './facturas.js';
import reportes from './reportes.js';
import propietarios from './propietarios.js';
import mascota from './mascota.js';
import notificaciones from './notificaciones.js';
import usuarios from './usuarios.js';

export const MODULOS = [
  inicio,
  citas,
  consultas,
  historial,
  tratamientos,
  recetas,
  recordatorios,
  propietarios,
  mascota,
  notificaciones,
  facturas,
  inventario,
  reportes,
  usuarios
];
