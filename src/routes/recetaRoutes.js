const { Router } = require('express');
const { recetas } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de recetas médicas digitales (HU-06).
 */
const router = Router();
router.use(requiereModulo('recetas'));

router.get('/', (req, res) => res.json(recetas.listar(req.usuario, req.query)));

router.get('/autocompletar/:mascotaId', requiereRol('veterinario'), (req, res) => {
  res.json(recetas.datosAutocompletados(req.params.mascotaId, req.usuario));
});

router.get('/:id', (req, res) => res.json(recetas.obtener(req.params.id, req.usuario)));

router.get('/:id/pdf', (req, res) => {
  const { nombre, contenido } = recetas.generarPDF(req.params.id, req.usuario);
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  res.send(contenido);
});

router.post('/', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(recetas.emitir(req.body || {}, req.usuario));
});

module.exports = router;
