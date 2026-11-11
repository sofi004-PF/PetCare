/**
 * Registro de las rutas de la API de PetCare.
 * Cada historia de usuario agrega aquí sus rutas.
 * @param {import('express').Express} app - Aplicación de Express.
 */
function registrarRutas(app) {
  app.use('/api/auth', require('./authRoutes'));
  app.use('/api/usuarios', require('./usuarioRoutes'));
  app.use('/api/propietarios', require('./propietarioRoutes'));
  app.use('/api/mascotas', require('./mascotaRoutes'));
  app.use('/api/citas', require('./citaRoutes'));
  app.use('/api/notificaciones', require('./notificacionRoutes'));
  app.use('/api/consultas', require('./consultaRoutes'));
}

module.exports = { registrarRutas };
