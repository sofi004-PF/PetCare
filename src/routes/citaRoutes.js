const { Router } = require('express');
const { citas } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de agendamiento de citas (HU-01).
 */
const router = Router();
router.use(requiereModulo('citas'));

router.get('/servicios', (req, res) => res.json(citas.listarServicios()));

router.get('/disponibilidad', (req, res) => {
  res.json(citas.disponibilidad(req.query.veterinarioId, req.query.desde));
});

router.get('/', (req, res) => res.json(citas.listar(req.usuario, req.query)));

router.get('/:id', (req, res) => res.json(citas.obtenerConAcceso(req.params.id, req.usuario)));

router.post('/', requiereRol('administrador', 'recepcionista', 'cliente'), (req, res) => {
  res.status(201).json(citas.agendar(req.body || {}, req.usuario));
});

router.post('/:id/cancelar', requiereRol('administrador', 'recepcionista', 'cliente'), (req, res) => {
  res.json(citas.cancelar(req.params.id, req.usuario));
});

router.put('/:id/reprogramar', requiereRol('administrador', 'recepcionista', 'cliente'), (req, res) => {
  res.json(citas.reprogramar(req.params.id, req.body || {}, req.usuario));
});

module.exports = router;
