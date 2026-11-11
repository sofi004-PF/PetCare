const { Router } = require('express');
const { historial } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas del historial clínico (HU-02). El cliente solo puede consultar el
 * historial de sus mascotas; solo el veterinario puede escribir en él.
 */
const router = Router();
router.use(requiereModulo('historial'));

router.get('/tipos', (req, res) => res.json(historial.listarTiposEntrada()));

router.get('/archivos/:id', (req, res) => {
  const archivo = historial.obtenerArchivo(req.params.id, req.usuario);
  res.type(archivo.tipoMime);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(archivo.rutaAbsoluta);
});

router.get('/:mascotaId', (req, res) => res.json(historial.obtenerHistorial(req.params.mascotaId, req.usuario)));

router.post('/:mascotaId/entradas', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(historial.agregarEntrada(req.params.mascotaId, req.body || {}, req.usuario));
});

router.post('/:mascotaId/archivos', requiereRol('veterinario'), (req, res) => {
  res.status(201).json(historial.adjuntarArchivo(req.params.mascotaId, req.body || {}, req.usuario));
});

module.exports = router;
