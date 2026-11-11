const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');
const controladores = require('../src/controllers');
const { fechaLocal, sumarDias } = require('../src/utils/fechas');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

async function crearProducto(admin, nombre, stockMinimo = 5) {
  return (await admin.post('/inventario/productos', { nombre, tipo: 'Medicamento', unidad: 'tableta', stockMinimo, precioVenta: 1000, ivaPorcentaje: 5 })).datos;
}

test('HU-04: el administrador registra lotes con fecha de caducidad', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const producto = await crearProducto(admin, 'Prueba lote');
  const r = await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'L-001', cantidad: 30, fechaCaducidad: sumarDias(fechaLocal(), 90) });
  assert.strictEqual(r.estado, 201);
  assert.strictEqual(r.datos.stock, 30);
  assert.strictEqual(r.datos.lotes[0].fecha_caducidad, sumarDias(fechaLocal(), 90));

  const vencido = await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'L-002', cantidad: 5, fechaCaducidad: sumarDias(fechaLocal(), -1) });
  assert.strictEqual(vencido.estado, 400);

  const veterinario = await servidor.como('veterinario@petcare.com');
  const sinPermiso = await veterinario.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'L-003', cantidad: 5, fechaCaducidad: sumarDias(fechaLocal(), 30) });
  assert.strictEqual(sinPermiso.estado, 403);
});

test('HU-04: resta unidades automáticamente al usar un insumo en consulta (FEFO)', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const producto = await crearProducto(admin, 'Prueba FEFO');
  await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'TARDE', cantidad: 10, fechaCaducidad: sumarDias(fechaLocal(), 200) });
  await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'PRONTO', cantidad: 4, fechaCaducidad: sumarDias(fechaLocal(), 20) });

  const veterinario = await servidor.como('veterinario@petcare.com');
  const [max] = (await veterinario.get('/mascotas?q=Max')).datos;
  const consulta = await veterinario.post('/consultas', {
    mascotaId: max.id, motivo: 'Control', sintomas: 'Ninguno', diagnostico: 'Sano', insumos: [{ productoId: producto.id, cantidad: 6 }]
  });
  assert.strictEqual(consulta.estado, 201);

  const detalle = (await admin.get(`/inventario/productos/${producto.id}`)).datos;
  assert.strictEqual(detalle.stock, 8);
  const pronto = detalle.lotes.find((l) => l.codigo === 'PRONTO');
  const tarde = detalle.lotes.find((l) => l.codigo === 'TARDE');
  assert.strictEqual(pronto.cantidad_disponible, 0, 'primero sale el lote que vence antes');
  assert.strictEqual(tarde.cantidad_disponible, 8);
  assert.ok(detalle.movimientos.some((m) => m.tipo === 'Salida' && m.motivo === 'Uso en consulta'));
});

test('HU-04: no permite usar más unidades de las disponibles y revierte la consulta', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const producto = await crearProducto(admin, 'Prueba sin stock');
  await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'X1', cantidad: 2, fechaCaducidad: sumarDias(fechaLocal(), 60) });
  const veterinario = await servidor.como('veterinario@petcare.com');
  const [rocky] = (await veterinario.get('/mascotas?q=Rocky')).datos;
  const antes = (await veterinario.get(`/consultas?mascotaId=${rocky.id}`)).datos.length;
  const r = await veterinario.post('/consultas', {
    mascotaId: rocky.id, motivo: 'X', sintomas: 'X', diagnostico: 'X', insumos: [{ productoId: producto.id, cantidad: 5 }]
  });
  assert.strictEqual(r.estado, 409);
  const despues = (await veterinario.get(`/consultas?mascotaId=${rocky.id}`)).datos.length;
  assert.strictEqual(despues, antes, 'la consulta no se guarda si falla el descuento');
});

test('HU-04: muestra alerta cuando un producto baja de su stock mínimo', async () => {
  const admin = await servidor.como('admin@petcare.com');
  const producto = await crearProducto(admin, 'Prueba alerta', 10);
  await admin.post(`/inventario/productos/${producto.id}/lotes`, { codigo: 'A1', cantidad: 12, fechaCaducidad: sumarDias(fechaLocal(), 60) });
  let alertas = (await admin.get('/inventario/alertas')).datos;
  assert.ok(!alertas.some((p) => p.id === producto.id));

  controladores.inventario.descontar(producto.id, 3, { motivo: 'Venta' });
  alertas = (await admin.get('/inventario/alertas')).datos;
  const alerta = alertas.find((p) => p.id === producto.id);
  assert.ok(alerta, 'aparece en la alerta del panel principal');
  assert.strictEqual(alerta.stock, 9);
  assert.ok(alertas.some((p) => p.nombre === 'Vacuna antirrábica'), 'los datos de ejemplo incluyen productos con stock bajo');
});
