const { Router } = require('express');
const { propietarios } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de propietarios y mascotas (HU-07).
 * El personal ve a todos los propietarios; el cliente solo su propia ficha.
 */
const router = Router();
router.use(requiereModulo('propietarios'));

router.get('/', (req, res) => {
  if (req.usuario.rol === 'cliente') {
    return res.json(req.usuario.propietarioId ? [propietarios.obtenerPropietario(req.usuario.propietarioId)] : []);
  }
  res.json(propietarios.listarPropietarios(req.query.q));
});

router.get('/especies', (req, res) => res.json(propietarios.listarEspecies()));

router.get('/:id', (req, res) => {
  propietarios.verificarAccesoPropietario(req.usuario, req.params.id);
  res.json(propietarios.obtenerPropietario(req.params.id));
});

router.post('/', requiereRol('administrador', 'recepcionista'), (req, res) => {
  res.status(201).json(propietarios.registrarConAcceso(req.body || {}));
});

router.put('/:id', requiereRol('administrador', 'recepcionista'), (req, res) => {
  res.json(propietarios.actualizarPorId(req.params.id, req.body || {}));
});

router.post('/:id/mascotas', requiereRol('administrador', 'recepcionista', 'cliente'), (req, res) => {
  propietarios.verificarAccesoPropietario(req.usuario, req.params.id);
  res.status(201).json(propietarios.registrarMascota(req.params.id, req.body || {}));
});

module.exports = router;
