const UsuarioController = require('./UsuarioController');
const PropietarioController = require('./PropietarioController');
const NotificacionController = require('./NotificacionController');
const CitaController = require('./CitaController');
const ConsultaController = require('./ConsultaController');
const HistorialController = require('./HistorialController');
const TratamientoController = require('./TratamientoController');

/**
 * Registro único de controladores (fachadas) de PetCare.
 * Las rutas web y las tareas programadas usan siempre estas instancias.
 */
const usuarios = new UsuarioController();
const propietarios = new PropietarioController(usuarios);
const notificaciones = new NotificacionController();
const citas = new CitaController(propietarios, notificaciones);
const consultas = new ConsultaController(propietarios, citas);
const historial = new HistorialController(propietarios);
const tratamientos = new TratamientoController(propietarios);
historial.registrarFuente((mascotaId) => consultas.eventosHistorial(mascotaId));
historial.registrarFuente((mascotaId) => tratamientos.eventosHistorial(mascotaId));

const controladores = {
  usuarios,
  propietarios,
  notificaciones,
  citas,
  consultas,
  historial,
  tratamientos
};

module.exports = controladores;
