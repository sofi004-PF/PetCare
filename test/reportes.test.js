const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');
const { fechaLocal, sumarDias } = require('../src/utils/fechas');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

test('HU-10: genera reportes de consultas, pacientes, servicios e inventario', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const tipos = (await admin.get('/reportes')).datos.map((t) => t.id);
  assert.deepStrictEqual(tipos, ['consultas', 'pacientes', 'servicios', 'inventario']);
  for (const tipo of tipos) {
    const r = await admin.get(`/reportes/${tipo}`);
    assert.strictEqual(r.estado, 200, tipo);
    assert.ok(r.datos.columnas.length > 0 && Array.isArray(r.datos.filas) && r.datos.resumen.length > 0, tipo);
  }
  const pacientes = (await admin.get('/reportes/pacientes')).datos;
  assert.strictEqual(pacientes.filas.length, 4);
  const inventario = (await admin.get('/reportes/inventario')).datos;
  assert.ok(inventario.filas.some((p) => p.estado === 'Stock bajo'));
});

test('HU-10: filtra por fechas, tipo de servicio y estado', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const servicios = (await admin.get('/citas/servicios')).datos;
  const vacunacion = servicios.find((s) => s.nombre === 'Vacunación');

  const todas = (await admin.get('/reportes/servicios')).datos.filas;
  const soloVacunacion = (await admin.get(`/reportes/servicios?servicioId=${vacunacion.id}`)).datos.filas;
  assert.ok(soloVacunacion.length > 0 && soloVacunacion.length < todas.length);
  assert.ok(soloVacunacion.every((c) => c.servicio === 'Vacunación'));

  const programadas = (await admin.get('/reportes/servicios?estado=Programada')).datos.filas;
  assert.ok(programadas.every((c) => c.estado === 'Programada'));

  const futuro = sumarDias(fechaLocal(), 400);
  const vacio = (await admin.get(`/reportes/consultas?desde=${futuro}`)).datos;
  assert.strictEqual(vacio.filas.length, 0);

  const stockBajo = (await admin.get('/reportes/inventario?estado=Stock%20bajo')).datos.filas;
  assert.ok(stockBajo.length > 0 && stockBajo.every((p) => p.estado === 'Stock bajo'));

  const malo = await admin.get(`/reportes/consultas?desde=${fechaLocal()}&hasta=${sumarDias(fechaLocal(), -5)}`);
  assert.strictEqual(malo.estado, 400);
});

test('HU-10: descarga el reporte en CSV compatible con Excel', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const r = await admin.get('/reportes/pacientes/csv');
  assert.strictEqual(r.estado, 200);
  const lineas = String(r.datos).replace(/^﻿/, '').trim().split('\r\n');
  assert.strictEqual(lineas[0], 'Mascota;Especie;Raza;Propietario;Teléfono;Consultas;Última consulta;Tratamientos activos');
  assert.strictEqual(lineas.length, 5, 'encabezado + 4 pacientes');
});

test('HU-10: solo el administrador genera reportes', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  assert.strictEqual((await recepcion.get('/reportes/consultas')).estado, 403);
  const veterinario = await servidor.como('veterinario@petcare.com');
  assert.strictEqual((await veterinario.get('/reportes/inventario/csv')).estado, 403);
});
