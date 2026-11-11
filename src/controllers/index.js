const UsuarioController = require('./UsuarioController');
const PropietarioController = require('./PropietarioController');

/**
 * Registro único de controladores (fachadas) de PetCare.
 * Las rutas web y las tareas programadas usan siempre estas instancias.
 */
const usuarios = new UsuarioController();
const propietarios = new PropietarioController(usuarios);

const controladores = {
  usuarios,
  propietarios
};

module.exports = controladores;
