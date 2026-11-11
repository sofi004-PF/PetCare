const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');
const { fechaLocal, sumarDias, diaSemana } = require('../src/utils/fechas');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

/** Próximo día laboral (lunes a sábado) a partir de mañana + desplazamiento. */
function proximoLaboral(desplazamiento = 0) {
  let fecha = sumarDias(fechaLocal(), 1 + desplazamiento);
  while (diaSemana(fecha) === 0) fecha = sumarDias(fecha, 1);
  return fecha;
}

function proximoDomingo() {
  let fecha = sumarDias(fechaLocal(), 1);
  while (diaSemana(fecha) !== 0) fecha = sumarDias(fecha, 1);
  return fecha;
}

async function datosBase() {
  const cliente = await servidor.como('cliente@petcare.com');
  const [mascota] = (await cliente.get('/mascotas')).datos;
  const [veterinario] = (await cliente.get('/usuarios/veterinarios')).datos;
  const servicios = (await cliente.get('/citas/servicios')).datos;
  return { cliente, mascota, veterinario, servicios };
}

test('HU-01: el cliente puede elegir el tipo de servicio (consulta general, vacunación, urgencia)', async () => {
  const { servicios } = await datosBase();
  assert.deepStrictEqual(servicios.map((s) => s.nombre), ['Consulta general', 'Vacunación', 'Urgencia']);
  assert.ok(servicios.every((s) => s.precio > 0));
});

test('HU-01: muestra un calendario con días y horarios disponibles del veterinario', async () => {
  const { cliente, veterinario } = await datosBase();
  const dias = (await cliente.get(`/citas/disponibilidad?veterinarioId=${veterinario.id}`)).datos;
  assert.strictEqual(dias.length, 14);
  const domingo = dias.find((d) => diaSemana(d.fecha) === 0);
  assert.strictEqual(domingo.laboral, false);
  const laboral = dias.find((d) => d.laboral && d.fecha > fechaLocal());
  assert.strictEqual(laboral.horarios.length, 16);
});

test('HU-01: agenda la cita y envía correo de confirmación con el código de reserva', async () => {
  const { cliente, mascota, veterinario, servicios } = await datosBase();
  const fecha = proximoLaboral(3);
  const r = await cliente.post('/citas', { mascotaId: mascota.id, veterinarioId: veterinario.id, servicioId: servicios[1].id, fecha, hora: '16:00' });
  assert.strictEqual(r.estado, 201);
  assert.match(r.datos.codigo, /^PC-[0-9A-F]{6}$/);
  assert.strictEqual(r.datos.costo, servicios[1].precio);

  const mensajes = (await cliente.get('/notificaciones')).datos;
  const confirmacion = mensajes.find((m) => m.asunto.includes(r.datos.codigo));
  assert.ok(confirmacion, 'debe existir el correo de confirmación');
  assert.strictEqual(confirmacion.canal, 'correo');
  assert.strictEqual(confirmacion.destinatario, 'laura.gomez@correo.com');

  const dias = (await cliente.get(`/citas/disponibilidad?veterinarioId=${veterinario.id}`)).datos;
  const horario = dias.find((d) => d.fecha === fecha).horarios.find((h) => h.hora === '16:00');
  assert.strictEqual(horario.disponible, false, 'el horario reservado ya no aparece disponible');
});

test('HU-01: no permite dos citas en el mismo horario con el mismo veterinario', async () => {
  const { cliente, mascota, veterinario, servicios } = await datosBase();
  const fecha = proximoLaboral(4);
  const primera = await cliente.post('/citas', { mascotaId: mascota.id, veterinarioId: veterinario.id, servicioId: servicios[0].id, fecha, hora: '08:30' });
  assert.strictEqual(primera.estado, 201);
  const recepcion = await servidor.como('recepcion@petcare.com');
  const [otraMascota] = (await recepcion.get('/mascotas?q=Rocky')).datos;
  const segunda = await recepcion.post('/citas', { mascotaId: otraMascota.id, veterinarioId: veterinario.id, servicioId: servicios[0].id, fecha, hora: '08:30' });
  assert.strictEqual(segunda.estado, 409);
});

test('HU-01: rechaza fechas pasadas, días no laborales y horas fuera de horario', async () => {
  const { cliente, mascota, veterinario, servicios } = await datosBase();
  const base = { mascotaId: mascota.id, veterinarioId: veterinario.id, servicioId: servicios[0].id };
  assert.strictEqual((await cliente.post('/citas', { ...base, fecha: sumarDias(fechaLocal(), -1), hora: '09:00' })).estado, 400);
  assert.strictEqual((await cliente.post('/citas', { ...base, fecha: proximoDomingo(), hora: '09:00' })).estado, 400);
  assert.strictEqual((await cliente.post('/citas', { ...base, fecha: proximoLaboral(5), hora: '12:30' })).estado, 400);
});

test('HU-01: el cliente no puede agendar para mascotas de otro propietario', async () => {
  const { cliente, veterinario, servicios } = await datosBase();
  const recepcion = await servidor.como('recepcion@petcare.com');
  const [ajena] = (await recepcion.get('/mascotas?q=Luna')).datos;
  const r = await cliente.post('/citas', { mascotaId: ajena.id, veterinarioId: veterinario.id, servicioId: servicios[0].id, fecha: proximoLaboral(6), hora: '09:00' });
  assert.strictEqual(r.estado, 403);
});

test('HU-01: cancelar libera el horario y se puede reprogramar', async () => {
  const { cliente, mascota, veterinario, servicios } = await datosBase();
  const fecha = proximoLaboral(7);
  const cita = (await cliente.post('/citas', { mascotaId: mascota.id, veterinarioId: veterinario.id, servicioId: servicios[0].id, fecha, hora: '14:00' })).datos;

  const reprogramada = await cliente.put(`/citas/${cita.id}/reprogramar`, { fecha, hora: '14:30' });
  assert.strictEqual(reprogramada.datos.hora, '14:30');

  const cancelada = await cliente.post(`/citas/${cita.id}/cancelar`);
  assert.strictEqual(cancelada.datos.estado, 'Cancelada');

  const nueva = await cliente.post('/citas', { mascotaId: mascota.id, veterinarioId: veterinario.id, servicioId: servicios[0].id, fecha, hora: '14:30' });
  assert.strictEqual(nueva.estado, 201, 'el horario cancelado vuelve a estar disponible');
});
