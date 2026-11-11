const { Router } = require('express');
const { recordatorios } = require('../controllers');

/**
 * Rutas públicas (sin iniciar sesión). Solo exponen acciones protegidas por
 * un token secreto enviado en el mensaje al cliente (HU-03).
 */
const router = Router();

router.get('/recordatorios/:token', (req, res) => {
  res.json(recordatorios.consultarPorToken(req.params.token));
});

router.post('/recordatorios/:token', (req, res) => {
  res.json(recordatorios.responderPorToken(req.params.token, (req.body || {}).accion));
});

module.exports = router;
