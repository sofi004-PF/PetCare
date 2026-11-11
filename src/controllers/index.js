const UsuarioController = require('./UsuarioController');
const PropietarioController = require('./PropietarioController');
const NotificacionController = require('./NotificacionController');
const CitaController = require('./CitaController');
const ConsultaController = require('./ConsultaController');

/**
 * Registro único de controladores (fachadas) de PetCare.
 * Las rutas web y las tareas programadas usan siempre estas instancias.
 */
const usuarios = new UsuarioController();
const propietarios = new PropietarioController(usuarios);
const notificaciones = new NotificacionController();
const citas = new CitaController(propietarios, notificaciones);
const consultas = new ConsultaController(propietarios, citas);

const controladores = {
  usuarios,
  propietarios,
  notificaciones,
  citas,
  consultas
};

module.exports = controladores;
