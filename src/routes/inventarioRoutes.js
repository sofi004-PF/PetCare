const { Router } = require('express');
const { inventario } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas del inventario de farmacia (HU-04). Solo el administrador modifica
 * productos y lotes; veterinarios y recepción consultan el stock.
 */
const router = Router();
router.use(requiereRol('administrador', 'veterinario', 'recepcionista'));

router.get('/productos', (req, res) => res.json(inventario.listarProductos()));
router.get('/alertas', (req, res) => res.json(inventario.alertasStock()));
router.get('/tipos', (req, res) => res.json(inventario.listarTipos()));

router.use(requiereModulo('inventario'));

router.get('/movimientos', (req, res) => res.json(inventario.listarMovimientos()));
router.get('/productos/:id', (req, res) => res.json(inventario.obtenerProducto(req.params.id)));
router.post('/productos', (req, res) => res.status(201).json(inventario.crearProducto(req.body || {})));
router.put('/productos/:id', (req, res) => res.json(inventario.actualizarProducto(req.params.id, req.body || {})));
router.post('/productos/:id/lotes', (req, res) => {
  res.status(201).json(inventario.registrarLote(req.params.id, req.body || {}, req.usuario));
});

module.exports = router;
