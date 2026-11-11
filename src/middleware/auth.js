const { usuarios } = require('../controllers');
const { puedeAcceder } = require('../config/permisos');

const NOMBRE_COOKIE = 'petcare_sid';

/**
 * Contrato: Lee una cookie de la petición.
 * @param {import('express').Request} req - Petición.
 * @param {string} nombre - Nombre de la cookie.
 * @returns {string|null} Valor o null.
 */
function leerCookie(req, nombre) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [clave, ...valor] = cookie.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return null;
}

/**
 * Middleware: identifica al usuario de la sesión (si existe) y lo deja en req.usuario.
 */
function cargarSesion(req, res, next) {
  const token = leerCookie(req, NOMBRE_COOKIE);
  if (token) {
    const usuario = usuarios.usuarioDeSesion(token);
    if (usuario) {
      req.usuario = usuario;
      req.token = token;
    }
  }
  next();
}

/**
 * Middleware: exige que haya una sesión iniciada.
 */
function requiereSesion(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión para continuar' });
  }
  next();
}

/**
 * Contrato: Middleware que restringe el acceso según la matriz de permisos (HU-11).
 * @param {string} modulo - Módulo que se quiere usar.
 * @returns {import('express').RequestHandler} Middleware.
 */
function requiereModulo(modulo) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Debe iniciar sesión para continuar' });
    }
    if (!puedeAcceder(req.usuario.rol, modulo)) {
      return res.status(403).json({ error: 'Su rol no tiene acceso a esta funcionalidad' });
    }
    next();
  };
}

/**
 * Contrato: Middleware que restringe a roles específicos.
 * @param {...string} roles - Roles permitidos.
 * @returns {import('express').RequestHandler} Middleware.
 */
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Debe iniciar sesión para continuar' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Su rol no tiene acceso a esta funcionalidad' });
    }
    next();
  };
}

/**
 * Contrato: Escribe la cookie de sesión.
 * @param {import('express').Response} res - Respuesta.
 * @param {string} token - Token de sesión.
 */
function escribirCookieSesion(res, token) {
  res.cookie(NOMBRE_COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
}

/**
 * Contrato: Elimina la cookie de sesión.
 * @param {import('express').Response} res - Respuesta.
 */
function borrarCookieSesion(res) {
  res.clearCookie(NOMBRE_COOKIE);
}

module.exports = { cargarSesion, requiereSesion, requiereModulo, requiereRol, escribirCookieSesion, borrarCookieSesion };
