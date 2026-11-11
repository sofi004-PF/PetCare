const UsuarioController = require('./UsuarioController');
const PropietarioController = require('./PropietarioController');
const NotificacionController = require('./NotificacionController');
const CitaController = require('./CitaController');
const ConsultaController = require('./ConsultaController');
const HistorialController = require('./HistorialController');
const TratamientoController = require('./TratamientoController');
const RecetaController = require('./RecetaController');
const RecordatorioController = require('./RecordatorioController');
const InventarioController = require('./InventarioController');
const FacturaController = require('./FacturaController');

/**
 * Registro único de controladores (fachadas) de PetCare.
 * Las rutas web y las tareas programadas usan siempre estas instancias.
 */
const usuarios = new UsuarioController();
const propietarios = new PropietarioController(usuarios);
const notificaciones = new NotificacionController();
const citas = new CitaController(propietarios, notificaciones);
const inventario = new InventarioController();
const consultas = new ConsultaController(propietarios, citas, inventario);
const historial = new HistorialController(propietarios);
const tratamientos = new TratamientoController(propietarios);
historial.registrarFuente((mascotaId) => consultas.eventosHistorial(mascotaId));
historial.registrarFuente((mascotaId) => tratamientos.eventosHistorial(mascotaId));
const recetas = new RecetaController(propietarios, notificaciones);
historial.registrarFuente((mascotaId) => recetas.eventosHistorial(mascotaId));
const recordatorios = new RecordatorioController(propietarios, notificaciones);

const facturas = new FacturaController(propietarios, inventario, notificaciones, citas);

const controladores = {
  facturas,
  inventario,
  recordatorios,
  usuarios,
  propietarios,
  notificaciones,
  citas,
  consultas,
  historial,
  tratamientos,
  recetas
};

module.exports = controladores;
