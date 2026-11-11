const path = require('path');
const express = require('express');
const { cargarSesion } = require('./middleware/auth');
const { registrarRutas } = require('./routes');
const { ErrorNegocio } = require('./utils/errores');

/**
 * Contrato: Construye la aplicación web de PetCare (API + vistas).
 * Capa de presentación: recibe peticiones HTTP y delega en los controladores.
 * @returns {import('express').Express} Aplicación lista para escuchar.
 */
function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '15mb' }));
  app.use(cargarSesion);

  registrarRutas(app);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(express.static(path.join(__dirname, 'views', 'public')));

  // Manejo centralizado de errores
  app.use((error, req, res, next) => {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'El archivo es demasiado grande (máximo 10 MB)' });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'La petición no tiene un formato válido' });
    }
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor' });
  });

  return app;
}

module.exports = { crearApp };
