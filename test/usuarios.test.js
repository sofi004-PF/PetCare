const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor, PASSWORD_PRUEBA } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

test('HU-11: rechaza credenciales incorrectas', async () => {
  const r = await fetch(`${servidor.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'admin@petcare.com', password: 'incorrecta' })
  });
  assert.strictEqual(r.status, 401);
});

test('HU-11: el administrador crea, modifica, desactiva y activa usuarios', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const creado = await admin.post('/usuarios', { nombre: 'Laura Test', correo: 'laura.test@petcare.com', password: 'Segura123*', rol: 'recepcionista' });
  assert.strictEqual(creado.estado, 201);
  assert.strictEqual(creado.datos.rol, 'recepcionista');
  assert.ok(!('password_hash' in creado.datos));

  const duplicado = await admin.post('/usuarios', { nombre: 'Otra', correo: 'laura.test@petcare.com', password: 'Segura123*', rol: 'veterinario' });
  assert.strictEqual(duplicado.estado, 409);

  const editado = await admin.put(`/usuarios/${creado.datos.id}`, { nombre: 'Laura Test', correo: 'laura.test@petcare.com', rol: 'veterinario' });
  assert.strictEqual(editado.datos.rol, 'veterinario');

  const desactivado = await admin.patch(`/usuarios/${creado.datos.id}/estado`, { activo: false });
  assert.strictEqual(desactivado.datos.activo, false);

  const login = await fetch(`${servidor.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'laura.test@petcare.com', password: 'Segura123*' })
  });
  assert.strictEqual(login.status, 401, 'un usuario desactivado no puede iniciar sesión');

  const activado = await admin.patch(`/usuarios/${creado.datos.id}/estado`, { activo: true });
  assert.strictEqual(activado.datos.activo, true);
});

test('HU-11: valida rol inexistente y contraseña corta', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const rolMalo = await admin.post('/usuarios', { nombre: 'X', correo: 'x@petcare.com', password: 'Segura123*', rol: 'jefe' });
  assert.strictEqual(rolMalo.estado, 400);
  const corta = await admin.post('/usuarios', { nombre: 'X', correo: 'x@petcare.com', password: '123', rol: 'veterinario' });
  assert.strictEqual(corta.estado, 400);
});

test('HU-11: el administrador no puede desactivarse a sí mismo', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const sesion = await admin.get('/auth/sesion');
  const r = await admin.patch(`/usuarios/${sesion.datos.usuario.id}/estado`, { activo: false });
  assert.strictEqual(r.estado, 400);
});

test('HU-11: restringe el acceso según el rol', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const r = await veterinario.get('/usuarios');
  assert.strictEqual(r.estado, 403);
  const sesion = await veterinario.get('/auth/sesion');
  assert.ok(!sesion.datos.modulos.includes('usuarios'));

  const anonimo = await fetch(`${servidor.url}/api/usuarios`);
  assert.strictEqual(anonimo.status, 401);
  assert.ok(PASSWORD_PRUEBA.length >= 8);
});
