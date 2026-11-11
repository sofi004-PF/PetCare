const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

// PNG de 1x1 píxel
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('HU-02: busca el historial por nombre de la mascota o documento del dueño', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const porNombre = (await veterinario.get('/mascotas?q=Max')).datos;
  assert.ok(porNombre.some((m) => m.nombre === 'Max'));
  const porDocumento = (await veterinario.get('/mascotas?q=1085123456')).datos;
  assert.deepStrictEqual(porDocumento.map((m) => m.nombre).sort(), ['Max', 'Nala']);
});

test('HU-02: cada entrada registra automáticamente fecha, hora y veterinario', async () => {
  const veterinario = await servidor.como('veterinario2@petcare.com');
  const [nala] = (await veterinario.get('/mascotas?q=Nala')).datos;
  const r = await veterinario.post(`/historial/${nala.id}/entradas`, { tipo: 'Vacuna', titulo: 'Triple felina', descripcion: 'Primera dosis', creado_en: '1999-01-01' });
  assert.strictEqual(r.estado, 201);
  assert.match(r.datos.creado_en, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.notStrictEqual(r.datos.creado_en.slice(0, 4), '1999', 'la fecha no se puede enviar desde el cliente');
  assert.strictEqual(r.datos.veterinario_nombre, 'Dr. Andrés Muñoz');

  const { eventos } = (await veterinario.get(`/historial/${nala.id}`)).datos;
  assert.ok(eventos.some((e) => e.titulo === 'Triple felina' && e.autor === 'Dr. Andrés Muñoz'));
});

test('HU-02: el historial reúne consultas y entradas en orden cronológico', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [max] = (await veterinario.get('/mascotas?q=Max')).datos;
  const { eventos } = (await veterinario.get(`/historial/${max.id}`)).datos;
  const tipos = new Set(eventos.map((e) => e.tipo));
  assert.ok(tipos.has('Consulta') && tipos.has('Vacuna') && tipos.has('Desparasitación'));
  const fechas = eventos.map((e) => e.fecha);
  assert.deepStrictEqual(fechas, [...fechas].sort().reverse());
});

test('HU-02: adjunta archivos (rayos X, exámenes) y los descarga', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const r = await veterinario.post(`/historial/${rocky.id}/archivos`, { nombre: 'radiografia torax.png', tipoMime: 'image/png', contenidoBase64: PNG_BASE64, descripcion: 'Rayos X' });
  assert.strictEqual(r.estado, 201);
  assert.ok(!('ruta' in r.datos), 'no expone la ruta interna del servidor');

  const descarga = await veterinario.get(`/historial/archivos/${r.datos.id}`);
  assert.strictEqual(descarga.estado, 200);

  const malo = await veterinario.post(`/historial/${rocky.id}/archivos`, { nombre: 'virus.exe', tipoMime: 'application/x-msdownload', contenidoBase64: PNG_BASE64 });
  assert.strictEqual(malo.estado, 400);
});

test('HU-02: el cliente consulta el historial de sus mascotas, pero no el de otros ni lo modifica', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const [max] = (await cliente.get('/mascotas')).datos.filter((m) => m.nombre === 'Max');
  assert.strictEqual((await cliente.get(`/historial/${max.id}`)).estado, 200);
  assert.strictEqual((await cliente.post(`/historial/${max.id}/entradas`, { tipo: 'Nota clínica', titulo: 'x' })).estado, 403);

  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  assert.strictEqual((await cliente.get(`/historial/${rocky.id}`)).estado, 403);
});
