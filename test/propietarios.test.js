const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

test('HU-07: registra un propietario con sus datos básicos y crea su acceso', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const r = await recepcion.post('/propietarios', {
    nombre: 'Pedro Paz', documento: '1087111222', telefono: '3001234567', correo: 'pedro.paz@correo.com',
    direccion: 'Calle 1, Pasto', crearAcceso: true, password: 'Cliente123*'
  });
  assert.strictEqual(r.estado, 201);
  assert.strictEqual(r.datos.documento, '1087111222');

  const login = await fetch(`${servidor.url}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'pedro.paz@correo.com', password: 'Cliente123*' })
  });
  assert.strictEqual(login.status, 200);
  assert.strictEqual((await login.json()).usuario.rol, 'cliente');
});

test('HU-07: no permite documentos repetidos ni datos incompletos', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const repetido = await recepcion.post('/propietarios', { nombre: 'X', documento: '1085123456', telefono: '1', correo: 'x@correo.com', direccion: 'x' });
  assert.strictEqual(repetido.estado, 409);
  const incompleto = await recepcion.post('/propietarios', { nombre: 'X', documento: '999' });
  assert.strictEqual(incompleto.estado, 400);
});

test('HU-07: si falla la creación del acceso no queda el propietario a medias', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const r = await recepcion.post('/propietarios', {
    nombre: 'Sin Acceso', documento: '555000', telefono: '1', correo: 'sin.acceso@correo.com', direccion: 'x', crearAcceso: true, password: '123'
  });
  assert.strictEqual(r.estado, 400);
  const lista = await recepcion.get('/propietarios?q=555000');
  assert.strictEqual(lista.datos.length, 0);
});

test('HU-07: consulta y actualiza la información de un propietario', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const [laura] = (await recepcion.get('/propietarios?q=1085123456')).datos;
  const actualizado = await recepcion.put(`/propietarios/${laura.id}`, { telefono: '3009998877' });
  assert.strictEqual(actualizado.datos.telefono, '3009998877');
  assert.strictEqual(actualizado.datos.documento, '1085123456');
});

test('HU-07: asocia varias mascotas a un propietario y consulta la relación', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const [ana] = (await recepcion.get('/propietarios?q=Ana')).datos;
  const r = await recepcion.post(`/propietarios/${ana.id}/mascotas`, { nombre: 'Kiwi', especie: 'Ave', sexo: 'Hembra' });
  assert.strictEqual(r.estado, 201);
  const detalle = await recepcion.get(`/propietarios/${ana.id}`);
  assert.deepStrictEqual(detalle.datos.mascotas.map((m) => m.nombre).sort(), ['Kiwi', 'Rocky']);
  const especieMala = await recepcion.post(`/propietarios/${ana.id}/mascotas`, { nombre: 'X', especie: 'Dragón' });
  assert.strictEqual(especieMala.estado, 400);
});

test('HU-07: el cliente solo ve su propia información y mascotas', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const lista = await cliente.get('/propietarios');
  assert.strictEqual(lista.datos.length, 1);
  assert.strictEqual(lista.datos[0].nombre, 'Laura Gómez');

  const recepcion = await servidor.como('recepcion@petcare.com');
  const [carlos] = (await recepcion.get('/propietarios?q=Carlos')).datos;
  assert.strictEqual((await cliente.get(`/propietarios/${carlos.id}`)).estado, 403);
  assert.strictEqual((await cliente.get(`/mascotas/${carlos.mascotas[0].id}`)).estado, 403);
  assert.strictEqual((await cliente.post('/propietarios', {})).estado, 403);
});
