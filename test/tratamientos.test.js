const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

const TRATAMIENTO = { medicamento: 'Meloxicam 1.5 mg/ml', dosis: '0.5 ml', frecuencia: 'Cada 24 horas', duracion: '5 días', indicaciones: 'Con comida' };

test('HU-09: registra un tratamiento con medicamento, dosis, frecuencia, duración e indicaciones', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const r = await veterinario.post('/tratamientos', { ...TRATAMIENTO, mascotaId: rocky.id });
  assert.strictEqual(r.estado, 201);
  assert.strictEqual(r.datos.estado, 'Activo');
  assert.strictEqual(r.datos.frecuencia, 'Cada 24 horas');
  const incompleto = await veterinario.post('/tratamientos', { mascotaId: rocky.id, medicamento: 'X' });
  assert.strictEqual(incompleto.estado, 400);
});

test('HU-09: consulta tratamientos actuales y anteriores, y registra evolución y finalización', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [nala] = (await veterinario.get('/mascotas?q=Nala')).datos;
  const t = (await veterinario.post('/tratamientos', { ...TRATAMIENTO, mascotaId: nala.id })).datos;

  const evolucion = await veterinario.post(`/tratamientos/${t.id}/evolucion`, { nota: 'Disminuye la cojera' });
  assert.strictEqual(evolucion.datos.evoluciones.length, 1);
  assert.strictEqual(evolucion.datos.estado, 'Activo');

  let lista = (await veterinario.get(`/tratamientos?mascotaId=${nala.id}`)).datos;
  assert.ok(lista.actuales.some((x) => x.id === t.id));

  const fin = await veterinario.post(`/tratamientos/${t.id}/evolucion`, { nota: 'Alta médica', finalizar: true });
  assert.strictEqual(fin.datos.estado, 'Finalizado');
  assert.ok(fin.datos.fechaFin);

  lista = (await veterinario.get(`/tratamientos?mascotaId=${nala.id}`)).datos;
  assert.ok(lista.anteriores.some((x) => x.id === t.id));
  assert.ok(!lista.actuales.some((x) => x.id === t.id));

  const otra = await veterinario.post(`/tratamientos/${t.id}/evolucion`, { nota: 'x' });
  assert.strictEqual(otra.estado, 400, 'no se modifica un tratamiento finalizado');
});

test('HU-09: el tratamiento aparece en el historial clínico y el cliente lo consulta', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const nala = (await cliente.get('/mascotas')).datos.find((m) => m.nombre === 'Nala');
  const { eventos } = (await cliente.get(`/historial/${nala.id}`)).datos;
  assert.ok(eventos.some((e) => e.tipo === 'Tratamiento'));
  assert.strictEqual((await cliente.get(`/tratamientos?mascotaId=${nala.id}`)).estado, 200);
  assert.strictEqual((await cliente.post('/tratamientos', { ...TRATAMIENTO, mascotaId: nala.id })).estado, 403);
});
