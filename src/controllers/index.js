const UsuarioController = require('./UsuarioController');

/**
 * Registro único de controladores (fachadas) de PetCare.
 * Las rutas web y las tareas programadas usan siempre estas instancias.
 */
const controladores = {
  usuarios: new UsuarioController()
};

module.exports = controladores;
