const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { iniciarServidor } = require('./ayudante');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.cerrar());

async function clienteYProducto(recepcion) {
  const [laura] = (await recepcion.get('/propietarios?q=1085123456')).datos;
  const productos = (await recepcion.get('/inventario/productos')).datos;
  const jeringa = productos.find((p) => p.nombre === 'Jeringa 3 ml');
  return { laura, jeringa };
}

test('HU-05: la factura incluye la clínica, los datos del cliente y cada ítem con IVA desglosado', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const { laura, jeringa } = await clienteYProducto(recepcion);
  const r = await recepcion.post('/facturas', {
    propietarioId: laura.id,
    metodoPago: 'Efectivo',
    items: [{ tipo: 'servicio', descripcion: 'Curación de herida', precio: 50000 }, { tipo: 'producto', productoId: jeringa.id, cantidad: 2 }]
  });
  assert.strictEqual(r.estado, 201);
  assert.match(r.datos.numero, /^FV-\d{5}$/);
  const [servicio, producto] = r.datos.items;
  assert.deepStrictEqual([servicio.subtotal, servicio.iva_porcentaje, servicio.iva, servicio.total], [50000, 19, 9500, 59500]);
  assert.deepStrictEqual([producto.subtotal, producto.iva, producto.total], [1600, 304, 1904]);
  assert.strictEqual(r.datos.total, 59500 + 1904);
  assert.strictEqual(r.datos.subtotal + r.datos.iva, r.datos.total);

  const detalle = (await recepcion.get(`/facturas/${r.datos.id}`)).datos;
  assert.strictEqual(detalle.clinica.nombre, 'Clínica Veterinaria PetCare');
  assert.strictEqual(detalle.cliente_documento, '1085123456');

  const pdf = await recepcion.get(`/facturas/${r.datos.id}/pdf`);
  assert.ok(String(pdf.datos).startsWith('%PDF'));
});

test('HU-05: permite los métodos de pago efectivo, tarjeta y transferencia', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const { laura } = await clienteYProducto(recepcion);
  assert.deepStrictEqual((await recepcion.get('/facturas/metodos-pago')).datos, ['Efectivo', 'Tarjeta', 'Transferencia']);
  for (const metodo of ['Tarjeta', 'Transferencia']) {
    const r = await recepcion.post('/facturas', { propietarioId: laura.id, metodoPago: metodo, items: [{ tipo: 'servicio', descripcion: 'Baño', precio: 30000 }] });
    assert.strictEqual(r.datos.metodo_pago, metodo);
  }
  const invalido = await recepcion.post('/facturas', { propietarioId: laura.id, metodoPago: 'Bitcoin', items: [{ tipo: 'servicio', descripcion: 'Baño', precio: 30000 }] });
  assert.strictEqual(invalido.estado, 400);
});

test('HU-05: envía la factura digital al correo del cliente con un clic', async () => {
  const recepcion = await servidor.como('recepcion@petcare.com');
  const { laura } = await clienteYProducto(recepcion);
  const factura = (await recepcion.post('/facturas', { propietarioId: laura.id, metodoPago: 'Efectivo', items: [{ tipo: 'servicio', descripcion: 'Corte de uñas', precio: 15000 }] })).datos;
  const enviada = await recepcion.post(`/facturas/${factura.id}/enviar`);
  assert.ok(enviada.datos.enviada_en);
  const mensaje = (await recepcion.get('/notificaciones?tipo=factura')).datos.find((m) => m.asunto.includes(factura.numero));
  assert.strictEqual(mensaje.destinatario, 'laura.gomez@correo.com');
  assert.strictEqual(mensaje.canal, 'correo');
});

test('HU-05: factura citas atendidas una sola vez y descuenta del inventario los productos vendidos', async () => {
  const veterinario = await servidor.como('veterinario@petcare.com');
  const recepcion = await servidor.como('recepcion@petcare.com');
  const { laura, jeringa } = await clienteYProducto(recepcion);
  const [cita] = (await recepcion.get(`/citas?estado=Programada`)).datos.filter((c) => c.propietarioId === laura.id);
  await veterinario.post('/consultas', { mascotaId: cita.mascotaId, citaId: cita.id, motivo: 'X', sintomas: 'X', diagnostico: 'X' });

  const pendientes = (await recepcion.get(`/facturas/por-facturar/${laura.id}`)).datos;
  assert.ok(pendientes.some((c) => c.id === cita.id));

  const r = await recepcion.post('/facturas', {
    propietarioId: laura.id, metodoPago: 'Tarjeta',
    items: [{ tipo: 'cita', citaId: cita.id }, { tipo: 'producto', productoId: jeringa.id, cantidad: 5 }]
  });
  assert.strictEqual(r.estado, 201);
  assert.strictEqual(r.datos.items[0].precio_unitario, cita.costo);

  const otra = await recepcion.post('/facturas', { propietarioId: laura.id, metodoPago: 'Tarjeta', items: [{ tipo: 'cita', citaId: cita.id }] });
  assert.strictEqual(otra.estado, 400, 'una cita no se factura dos veces');

  const stock = (await recepcion.get('/inventario/productos')).datos.find((p) => p.id === jeringa.id).stock;
  assert.strictEqual(stock, jeringa.stock - 5);
});

test('HU-05: el cliente consulta sus facturas pero no puede generarlas', async () => {
  const cliente = await servidor.como('cliente@petcare.com');
  const lista = (await cliente.get('/facturas')).datos;
  assert.ok(lista.length > 0 && lista.every((f) => f.cliente_nombre === 'Laura Gómez'));
  assert.strictEqual((await cliente.post('/facturas', {})).estado, 403);
});
