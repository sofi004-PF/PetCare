const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');
const controladores = require('../src/controllers');
const { fechaLocal, sumarDias } = require('../src/utils/fechas');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

async function programar(dias, canal = 'correo') {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [max] = (await veterinario.get('/mascotas?q=Max')).datos;
  const fecha = sumarDias(fechaLocal(), dias);
  const r = await veterinario.post('/recordatorios', { mascotaId: max.id, tipo: 'Vacuna', descripcion: `Prueba ${dias} días`, fechaProgramada: fecha, canal });
  return { r, fecha };
}

function mensajesDe(descripcion) {
  return controladores.notificaciones.listar({ rol: 'administrador' }, { tipo: 'recordatorio' })
    .filter((m) => m.cuerpo.includes(descripcion));
}

test('HU-03: el veterinario configura la fecha del próximo recordatorio', async () => {
  const { r, fecha } = await programar(30);
  assert.strictEqual(r.estado, 201);
  assert.strictEqual(r.datos.fecha_programada, fecha);
  assert.strictEqual(r.datos.estado, 'Pendiente');
  assert.ok(!('token' in r.datos), 'el token secreto no se expone en la API');
});

test('HU-03: envía el mensaje 3 días antes de la fecha programada, una sola vez', async () => {
  const { fecha } = await programar(12);
  assert.strictEqual(mensajesDe('Prueba 12 días').length, 0, 'aún no se envía');

  controladores.recordatorios.procesarPendientes(sumarDias(fecha, -4));
  assert.strictEqual(mensajesDe('Prueba 12 días').length, 0, '4 días antes todavía no se envía');

  controladores.recordatorios.procesarPendientes(sumarDias(fecha, -3));
  const enviados = mensajesDe('Prueba 12 días');
  assert.strictEqual(enviados.length, 1, '3 días antes se envía');
  assert.strictEqual(enviados[0].canal, 'correo');
  assert.match(enviados[0].enlace, /^#\/responder\/[a-f0-9]{48}$/);

  controladores.recordatorios.procesarPendientes(sumarDias(fecha, -2));
  assert.strictEqual(mensajesDe('Prueba 12 días').length, 1, 'no se envía dos veces');
});

test('HU-03: también se envía por SMS al teléfono del cliente', async () => {
  await programar(2, 'sms');
  const [sms] = mensajesDe('Prueba 2 días');
  assert.ok(sms, 'si la fecha ya está dentro del plazo, se envía de inmediato');
  assert.strictEqual(sms.canal, 'sms');
  assert.strictEqual(sms.destinatario, '3104567890');
});

test('HU-03: el cliente confirma o cancela su asistencia desde el mensaje', async () => {
  await programar(1);
  const [mensaje] = mensajesDe('Prueba 1 días');
  const token = mensaje.enlace.split('/').pop();

  const consulta = await fetch(`${servidor.url}/api/publico/recordatorios/${token}`);
  assert.strictEqual(consulta.status, 200);
  assert.strictEqual((await consulta.json()).estado, 'Pendiente');

  const confirmar = await fetch(`${servidor.url}/api/publico/recordatorios/${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'confirmar' })
  });
  assert.strictEqual((await confirmar.json()).estado, 'Confirmado');

  const cancelar = await fetch(`${servidor.url}/api/publico/recordatorios/${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cancelar' })
  });
  assert.strictEqual((await cancelar.json()).estado, 'Cancelado');

  const falso = await fetch(`${servidor.url}/api/publico/recordatorios/${'0'.repeat(48)}`);
  assert.strictEqual(falso.status, 404);
});

test('HU-03: el cliente ve sus recordatorios y no puede programarlos', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const lista = (await cliente.get('/recordatorios')).datos;
  assert.ok(lista.length > 0);
  assert.ok(lista.every((r) => r.propietario_nombre === 'Laura Gómez'));
  const [max] = (await cliente.get('/mascotas')).datos.filter((m) => m.nombre === 'Max');
  const r = await cliente.post('/recordatorios', { mascotaId: max.id, tipo: 'Vacuna', descripcion: 'x', fechaProgramada: sumarDias(fechaLocal(), 5) });
  assert.strictEqual(r.estado, 403);
});

test('HU-03: no permite programar en fechas pasadas', async () => {
  const { r } = await programar(-1);
  assert.strictEqual(r.estado, 400);
});
