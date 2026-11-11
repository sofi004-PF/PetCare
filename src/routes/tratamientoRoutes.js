const { Router } = require('express');
const { tratamientos } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de tratamientos (HU-09). El cliente puede consultar los de sus mascotas.
 */
const router = Router();
router.use(requiereModulo('tratamientos'));

router.get('/', (req, res) => {
  if (req.query.mascotaId) {
    return res.json(tratamientos.listarPorMascota(req.query.mascotaId, req.usuario));
  }
  if (req.usuario.rol === 'cliente') {
    return res.status(400).json({ error: 'Indique la mascota' });
  }
  res.json(tratamientos.listarActivos());
});

router.post('/', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(tratamientos.registrar(req.body || {}, req.usuario));
});

router.post('/:id/evolucion', requiereRol('veterinario'), (req, res) => {
  res.json(tratamientos.registrarEvolucion(req.params.id, req.body || {}, req.usuario));
});

module.exports = router;
