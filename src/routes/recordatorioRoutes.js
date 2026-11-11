const { Router } = require('express');
const { recordatorios } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de recordatorios de vacunación y desparasitación (HU-03).
 */
const router = Router();
router.use(requiereModulo('recordatorios'));

router.get('/', (req, res) => res.json(recordatorios.listar(req.usuario, req.query)));

router.post('/', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(recordatorios.programar(req.body || {}, req.usuario));
});

router.post('/procesar', requiereRol('administrador'), (req, res) => {
  res.json({ enviados: recordatorios.procesarPendientes() });
});

router.post('/:id/responder', requiereRol('cliente'), (req, res) => {
  res.json(recordatorios.responder(req.params.id, (req.body || {}).accion, req.usuario));
});

module.exports = router;
