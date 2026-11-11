const { Router } = require('express');
const { reportes } = require('../controllers');
const { requiereModulo } = require('../middleware/auth');

/**
 * Rutas de reportes administrativos y clínicos (HU-10). Solo administrador.
 */
const router = Router();
router.use(requiereModulo('reportes'));

router.get('/', (req, res) => res.json(reportes.listarTipos()));

router.get('/:tipo', (req, res) => res.json(reportes.generar(req.params.tipo, req.query)));

router.get('/:tipo/csv', (req, res) => {
  const reporte = reportes.generar(req.params.tipo, req.query);
  res.type('text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${reporte.tipo}.csv"`);
  res.send(reportes.aCSV(reporte));
});

module.exports = router;
