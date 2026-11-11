const { Router } = require('express');
const { notificaciones } = require('../controllers');
const { requiereModulo } = require('../middleware/auth');

/**
 * Bandeja de mensajes enviados a los clientes (correo, SMS, WhatsApp).
 */
const router = Router();
router.use(requiereModulo('notificaciones'));

router.get('/', (req, res) => res.json(notificaciones.listar(req.usuario, req.query)));

module.exports = router;
