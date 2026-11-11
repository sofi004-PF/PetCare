const { Router } = require('express');
const { usuarios } = require('../controllers');
const { requiereModulo, requiereSesion } = require('../middleware/auth');

/**
 * Rutas de gestión de usuarios y roles (HU-11). Solo para administradores,
 * excepto la lista de veterinarios, que necesitan otros módulos.
 */
const router = Router();

router.get('/veterinarios', requiereSesion, (req, res) => {
  res.json(usuarios.listarVeterinarios());
});

router.use(requiereModulo('usuarios'));

router.get('/', (req, res) => res.json(usuarios.listarUsuarios()));

router.get('/roles', (req, res) => res.json(usuarios.listarRoles()));

router.post('/', (req, res) => res.status(201).json(usuarios.crearUsuario(req.body || {})));

router.put('/:id', (req, res) => res.json(usuarios.actualizarUsuario(req.params.id, req.body || {}, req.usuario.id)));

router.patch('/:id/estado', (req, res) => {
  res.json(usuarios.cambiarEstado(req.params.id, Boolean((req.body || {}).activo), req.usuario.id));
});

module.exports = router;
