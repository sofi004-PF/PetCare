const { Router } = require('express');
const { usuarios } = require('../controllers');
const { requiereSesion, escribirCookieSesion, borrarCookieSesion } = require('../middleware/auth');

/**
 * Rutas de autenticación (HU-11): inicio y cierre de sesión.
 */
const router = Router();

router.post('/login', (req, res) => {
  const { correo, password } = req.body || {};
  const { token, ...sesion } = usuarios.iniciarSesion(correo, password);
  escribirCookieSesion(res, token);
  res.json(sesion);
});

router.post('/logout', (req, res) => {
  usuarios.cerrarSesion(req.token);
  borrarCookieSesion(res);
  res.json({ ok: true });
});

router.get('/sesion', requiereSesion, (req, res) => {
  res.json(usuarios.datosSesion(req.usuario));
});

module.exports = router;
