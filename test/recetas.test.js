const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

const MEDICAMENTO = { medicamento: 'Prednisolona 5 mg', dosis: '1 tableta', frecuencia: 'Cada 24 horas', duracion: '5 días' };

test('HU-06: autocompleta los datos del paciente y del veterinario que emite', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const datos = (await veterinario.get(`/recetas/autocompletar/${rocky.id}`)).datos;
  assert.strictEqual(datos.paciente.nombre, 'Rocky');
  assert.strictEqual(datos.propietario.nombre, 'Ana Benavides');
  assert.strictEqual(datos.veterinario.nombre, 'Dra. Valentina Ruiz');
});

test('HU-06: exige nombre, dosis, frecuencia y duración de cada medicamento', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  assert.strictEqual((await veterinario.post('/recetas', { mascotaId: rocky.id, medicamentos: [] })).estado, 400);
  assert.strictEqual((await veterinario.post('/recetas', { mascotaId: rocky.id, medicamentos: [{ medicamento: 'X', dosis: '1' }] })).estado, 400);
});

test('HU-06: genera la receta en PDF y la envía al correo del cliente', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const r = await veterinario.post('/recetas', { mascotaId: rocky.id, canalEnvio: 'correo', medicamentos: [MEDICAMENTO] });
  assert.strictEqual(r.estado, 201);
  assert.match(r.datos.numero, /^RX-\d{5}$/);

  const pdf = await fetch(`${servidor.url}/api/recetas/${r.datos.id}/pdf`, { headers: { Cookie: '' } });
  assert.strictEqual(pdf.status, 401, 'el PDF requiere sesión');

  const recepcion = await servidor.como('admin@petcare.com');
  const descarga = await recepcion.get(`/recetas/${r.datos.id}/pdf`);
  assert.strictEqual(descarga.estado, 200);
  assert.ok(String(descarga.datos).startsWith('%PDF-1.4'));

  const mensajes = (await recepcion.get('/notificaciones?tipo=receta')).datos;
  const envio = mensajes.find((m) => m.asunto.includes(r.datos.numero));
  assert.strictEqual(envio.canal, 'correo');
  assert.strictEqual(envio.destinatario, 'ana.benavides@correo.com');
});

test('HU-06: también se puede enviar por WhatsApp al número del cliente', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const r = await veterinario.post('/recetas', { mascotaId: rocky.id, canalEnvio: 'whatsapp', medicamentos: [MEDICAMENTO] });
  const admin = await servidor.como('admin@petcare.com');
  const envio = (await admin.get('/notificaciones?tipo=receta')).datos.find((m) => m.asunto.includes(r.datos.numero));
  assert.strictEqual(envio.canal, 'whatsapp');
  assert.strictEqual(envio.destinatario, '3159871234');
});

test('HU-06: el cliente descarga solo las recetas de sus mascotas', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const ajena = (await veterinario.post('/recetas', { mascotaId: rocky.id, medicamentos: [MEDICAMENTO] })).datos;
  assert.strictEqual((await cliente.get(`/recetas/${ajena.id}/pdf`)).estado, 403);
  const propias = (await cliente.get('/recetas')).datos;
  assert.ok(propias.every((r) => r.propietario_nombre === 'Laura Gómez'));
});
