const { Router } = require('express');
const { propietarios } = require('../controllers');
const { requiereModulo, requiereRol } = require('../middleware/auth');

/**
 * Rutas de mascotas (pacientes). El cliente solo accede a las suyas.
 */
const router = Router();
router.use(requiereModulo('mascotas'));

router.get('/', (req, res) => {
  if (req.usuario.rol === 'cliente') {
    const propio = req.usuario.propietarioId ? propietarios.obtenerPropietario(req.usuario.propietarioId) : null;
    return res.json(propio ? propio.mascotas : []);
  }
  res.json(propietarios.buscarMascotas(req.query.q));
});

router.get('/:id', (req, res) => {
  res.json(propietarios.verificarAccesoMascota(req.usuario, req.params.id));
});

router.put('/:id', requiereRol('administrador', 'recepcionista', 'veterinario', 'cliente'), (req, res) => {
  propietarios.verificarAccesoMascota(req.usuario, req.params.id);
  res.json(propietarios.actualizarMascota(req.params.id, req.body || {}));
});

module.exports = router;
