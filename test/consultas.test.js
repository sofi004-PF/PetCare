const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

const CONSULTA = { motivo: 'Vómito', sintomas: 'Vómito desde ayer, decaimiento', diagnostico: 'Gastritis leve', observaciones: 'Dieta blanda 3 días', pesoKg: 27.9, temperaturaC: 39.1 };

test('HU-08: registra la consulta con fecha, motivo, síntomas, diagnóstico y observaciones', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const r = await veterinario.post('/consultas', { ...CONSULTA, mascotaId: rocky.id });
  assert.strictEqual(r.estado, 201);
  assert.match(r.datos.fecha, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'la fecha y hora se asignan automáticamente');
  assert.strictEqual(r.datos.diagnostico, 'Gastritis leve');
});

test('HU-08: asocia la consulta con la mascota y el veterinario responsable', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const sesion = (await veterinario.get('/auth/sesion')).datos;
  const [luna] = (await veterinario.get('/mascotas?q=Luna')).datos;
  const r = await veterinario.post('/consultas', { ...CONSULTA, mascotaId: luna.id, veterinarioId: 9999 });
  assert.strictEqual(r.datos.mascotaId, luna.id);
  assert.strictEqual(r.datos.veterinarioId, sesion.usuario.id, 'el veterinario es siempre el usuario que atiende');
  assert.strictEqual(r.datos.veterinarioNombre, 'Dra. Valentina Ruiz');
});

test('HU-08: consulta las consultas anteriores de una mascota', async () => {
  const veterinario = await servidor.como('veterinario2@petcare.com');
  const [max] = (await veterinario.get('/mascotas?q=Max')).datos;
  await veterinario.post('/consultas', { ...CONSULTA, mascotaId: max.id, motivo: 'Revisión' });
  const lista = (await veterinario.get(`/consultas?mascotaId=${max.id}`)).datos;
  assert.ok(lista.length >= 2, 'incluye la consulta de ejemplo y la nueva');
  assert.ok(lista.every((c) => c.mascotaId === max.id));
  assert.strictEqual(lista[0].motivo, 'Revisión', 'la más reciente aparece primero');
});

test('HU-08: al atender una cita, la cita queda como Atendida', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const sesion = (await veterinario.get('/auth/sesion')).datos;
  const [cita] = (await veterinario.get(`/citas?veterinarioId=${sesion.usuario.id}&estado=Programada`)).datos;
  const r = await veterinario.post('/consultas', { ...CONSULTA, mascotaId: cita.mascotaId, citaId: cita.id });
  assert.strictEqual(r.estado, 201);
  const actualizada = (await veterinario.get(`/citas/${cita.id}`)).datos;
  assert.strictEqual(actualizada.estado, 'Atendida');
});

test('HU-08: valida datos obligatorios y que solo el veterinario registre', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [max] = (await veterinario.get('/mascotas?q=Max')).datos;
  assert.strictEqual((await veterinario.post('/consultas', { mascotaId: max.id, motivo: 'X' })).estado, 400);
  assert.strictEqual((await veterinario.post('/consultas', { ...CONSULTA, mascotaId: max.id, temperaturaC: 80 })).estado, 400);

  const admin = await servidor.como('admin@petcare.com');
  assert.strictEqual((await admin.post('/consultas', { ...CONSULTA, mascotaId: max.id })).estado, 403);
  const recepcion = await servidor.como('recepcion@petcare.com');
  assert.strictEqual((await recepcion.get('/consultas')).estado, 403);
});
