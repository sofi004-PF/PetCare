/**
 * Registro de las rutas de la API de PetCare.
 * Cada historia de usuario agrega aquí sus rutas.
 * @param {import('express').Express} app - Aplicación de Express.
 */
function registrarRutas(app) {
  app.use('/api/auth', require('./authRoutes'));
  app.use('/api/publico', require('./publicoRoutes'));
  app.use('/api/usuarios', require('./usuarioRoutes'));
  app.use('/api/propietarios', require('./propietarioRoutes'));
  app.use('/api/mascotas', require('./mascotaRoutes'));
  app.use('/api/citas', require('./citaRoutes'));
  app.use('/api/notificaciones', require('./notificacionRoutes'));
  app.use('/api/consultas', require('./consultaRoutes'));
  app.use('/api/historial', require('./historialRoutes'));
  app.use('/api/tratamientos', require('./tratamientoRoutes'));
  app.use('/api/recetas', require('./recetaRoutes'));
  app.use('/api/recordatorios', require('./recordatorioRoutes'));
  app.use('/api/inventario', require('./inventarioRoutes'));
  app.use('/api/facturas', require('./facturaRoutes'));
}

module.exports = { registrarRutas };
