import { get, post, put } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, insignia, encabezado, fecha, fechaHora, moneda } from '../ui.js';

/**
 * HU-04: Control de inventario de farmacia veterinaria (administrador).
 */
export default {
  id: 'inventario',
  titulo: 'Inventario',
  icono: '📦',
  descripcion: 'Medicamentos, insumos y lotes',

  async render(contenedor, ctx) {
    if (ctx.parametros[0]) return renderDetalle(contenedor, ctx, ctx.parametros[0]);
    const [productos, tipos] = await Promise.all([get('/inventario/productos'), get('/inventario/tipos')]);
    const bajos = productos.filter((p) => p.bajoMinimo);

    reemplazar(contenedor,
      encabezado('Inventario de farmacia', 'El stock se descuenta automáticamente con cada venta o uso en consulta.',
        h('button', { onClick: () => formularioProducto(ctx, tipos) }, '+ Nuevo producto')
      ),
      bajos.length ? alertaStock(bajos) : null,
      h('div', { class: 'tarjeta' }, tabla([
        { titulo: 'Producto', valor: (p) => h('a', { href: `#/inventario/${p.id}` }, h('strong', {}, p.nombre)) },
        { titulo: 'Tipo', valor: (p) => p.tipo },
        { titulo: 'Stock', clase: 'numero', valor: (p) => `${p.stock} ${p.unidad}(s)` },
        { titulo: 'Mínimo', clase: 'numero', valor: (p) => p.stock_minimo },
        { titulo: 'Estado', valor: (p) => (p.bajoMinimo ? insignia('Stock bajo', 'peligro') : insignia('Normal', 'exito')) },
        { titulo: 'Próxima caducidad', valor: (p) => (p.proxima_caducidad ? h('span', {}, fecha(p.proxima_caducidad), ' ', p.proximoAVencer ? insignia('Vence pronto', 'alerta') : null) : '—') },
        { titulo: 'Precio', clase: 'numero', valor: (p) => moneda(p.precio_venta) },
        { titulo: '', valor: (p) => h('button', { class: 'secundario pequeno', onClick: () => formularioLote(ctx, p) }, '+ Lote') }
      ], productos, 'No hay productos registrados'))
    );
  },

  async widgetInicio() {
    const bajos = await get('/inventario/alertas');
    if (!bajos.length) return null;
    return alertaStock(bajos);
  }
};

/**
 * Alerta visual de productos por debajo de su stock mínimo.
 * @param {Array<Object>} productos - Productos con stock bajo.
 * @returns {HTMLElement} Alerta.
 */
function alertaStock(productos) {
  return h('div', { class: 'alerta peligro', role: 'alert', style: 'grid-column:1 / -1' },
    h('strong', {}, `⚠️ ${productos.length} producto(s) por debajo del stock mínimo`),
    h('ul', { style: 'margin:0.5rem 0 0' }, productos.map((p) => h('li', {},
      h('a', { href: `#/inventario/${p.id}`, style: 'color:inherit' }, p.nombre), `: ${p.stock} de ${p.stock_minimo} ${p.unidad}(s) mínimas`
    )))
  );
}

function formularioProducto(ctx, tipos, producto = null) {
  const modal = abrirModal(producto ? 'Editar producto' : 'Nuevo producto', formulario([
    { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, valor: producto?.nombre, ancho: 'completo' },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: tipos.map((t) => ({ valor: t, texto: t })), valor: producto?.tipo },
    { nombre: 'unidad', etiqueta: 'Unidad de medida', requerido: true, placeholder: 'tableta, dosis, frasco…', valor: producto?.unidad },
    { nombre: 'stockMinimo', etiqueta: 'Stock mínimo', tipo: 'number', requerido: true, min: '0', valor: producto?.stock_minimo },
    { nombre: 'precioVenta', etiqueta: 'Precio de venta (COP)', tipo: 'number', requerido: true, min: '0', valor: producto?.precio_venta },
    { nombre: 'ivaPorcentaje', etiqueta: 'IVA', tipo: 'select', opciones: [{ valor: 19, texto: '19 %' }, { valor: 5, texto: '5 %' }, { valor: 0, texto: 'Exento (0 %)' }], valor: producto?.iva_porcentaje ?? 19 }
  ], async (datos) => {
    const cuerpo = { ...datos, ivaPorcentaje: Number(datos.ivaPorcentaje) };
    if (producto) await put(`/inventario/productos/${producto.id}`, cuerpo);
    else await post('/inventario/productos', cuerpo);
    aviso(producto ? 'Producto actualizado' : 'Producto creado. Registre su primer lote.', 'exito');
    modal.cerrar();
    ctx.recargar();
  }));
}

function formularioLote(ctx, producto) {
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const modal = abrirModal(`Nuevo lote de ${producto.nombre}`, formulario([
    { nombre: 'codigo', etiqueta: 'Código del lote', requerido: true },
    { nombre: 'cantidad', etiqueta: `Cantidad (${producto.unidad}s)`, tipo: 'number', requerido: true, min: '1' },
    { nombre: 'fechaCaducidad', etiqueta: 'Fecha de caducidad', tipo: 'date', requerido: true, min: manana }
  ], async (datos) => {
    await post(`/inventario/productos/${producto.id}/lotes`, datos);
    aviso('Lote registrado', 'exito');
    modal.cerrar();
    ctx.recargar();
  }, { textoBoton: 'Registrar lote' }));
}

async function renderDetalle(contenedor, ctx, id) {
  const [p, tipos] = await Promise.all([get(`/inventario/productos/${id}`), get('/inventario/tipos')]);
  reemplazar(contenedor,
    encabezado(p.nombre, `${p.tipo} · Stock ${p.stock} ${p.unidad}(s) · Mínimo ${p.stock_minimo}`,
      h('a', { class: 'boton secundario', href: '#/inventario' }, '← Volver'),
      h('button', { class: 'secundario', onClick: () => formularioProducto(ctx, tipos, p) }, 'Editar'),
      h('button', { onClick: () => formularioLote(ctx, p) }, '+ Registrar lote')
    ),
    p.bajoMinimo ? alertaStock([p]) : null,
    h('div', { class: 'rejilla-2' },
      h('div', { class: 'tarjeta' }, h('h2', {}, 'Lotes'), tabla([
        { titulo: 'Lote', valor: (l) => h('strong', {}, l.codigo) },
        { titulo: 'Caducidad', valor: (l) => h('span', {}, fecha(l.fecha_caducidad), ' ', l.vencido ? insignia('Vencido', 'peligro') : null) },
        { titulo: 'Disponible', clase: 'numero', valor: (l) => `${l.cantidad_disponible} / ${l.cantidad_inicial}` },
        { titulo: 'Ingreso', valor: (l) => fecha(l.creado_en) }
      ], p.lotes, 'Sin lotes registrados')),
      h('div', { class: 'tarjeta' }, h('h2', {}, 'Movimientos'), tabla([
        { titulo: 'Fecha', valor: (m) => fechaHora(m.creado_en) },
        { titulo: 'Tipo', valor: (m) => insignia(m.tipo, m.tipo === 'Entrada' ? 'exito' : 'info') },
        { titulo: 'Cantidad', clase: 'numero', valor: (m) => m.cantidad },
        { titulo: 'Motivo', valor: (m) => `${m.motivo}${m.referencia ? ` · ${m.referencia}` : ''}` },
        { titulo: 'Lote', valor: (m) => m.lote_codigo || '—' }
      ], p.movimientos, 'Sin movimientos'))
    )
  );
}
