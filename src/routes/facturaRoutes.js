const { Router } = require('express');
const { facturas } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de facturación (HU-05). El cliente solo consulta sus facturas.
 */
const router = Router();
router.use(requiereModulo('facturas'));

const PERSONAL = requiereRol('administrador', 'recepcionista');

router.get('/', (req, res) => res.json(facturas.listar(req.usuario, req.query)));
router.get('/metodos-pago', (req, res) => res.json(facturas.listarMetodosPago()));
router.get('/por-facturar/:propietarioId', PERSONAL, (req, res) => res.json(facturas.serviciosPorFacturar(req.params.propietarioId)));
router.get('/:id', (req, res) => res.json(facturas.obtener(req.params.id, req.usuario)));

router.get('/:id/pdf', (req, res) => {
  const { nombre, contenido } = facturas.generarPDF(req.params.id, req.usuario);
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  res.send(contenido);
});

router.post('/', PERSONAL, (req, res) => res.status(201).json(facturas.generar(req.body || {}, req.usuario)));
router.post('/:id/enviar', PERSONAL, (req, res) => res.json(facturas.enviarPorCorreo(req.params.id)));

module.exports = router;
