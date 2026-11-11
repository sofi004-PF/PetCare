const { Router } = require('express');
const { consultas } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas del registro de consultas veterinarias (HU-08).
 */
const router = Router();
router.use(requiereModulo('consultas'));

router.get('/', (req, res) => {
  if (req.query.mascotaId) {
    return res.json(consultas.listarPorMascota(req.query.mascotaId, req.usuario));
  }
  res.json(consultas.listar(req.query));
});

router.get('/:id', (req, res) => res.json(consultas.obtener(req.params.id, req.usuario)));

router.post('/', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(consultas.registrar(req.body || {}, req.usuario));
});

module.exports = router;
