/**
 * Registro de las rutas de la API de PetCare.
 * Cada historia de usuario agrega aquí sus rutas.
 * @param {import('express').Express} app - Aplicación de Express.
 */
function registrarRutas(app) {
  app.use('/api/auth', require('./authRoutes'));
  app.use('/api/usuarios', require('./usuarioRoutes'));
}

module.exports = { registrarRutas };
