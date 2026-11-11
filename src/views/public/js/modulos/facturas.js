import { get, post } from '../api.js';
import { h, reemplazar, aviso, tabla, encabezado, listaDatos, fechaHora, moneda, insignia, botonVolver, botonIcono } from '../ui.js';
import { icono } from '../iconos.js';

const IVA_SERVICIOS = 19;
const PERSONAL = ['administrador', 'recepcionista'];

/**
 * HU-05: Generación de facturas por servicios prestados.
 */
export default {
  id: 'facturas',
  titulo: 'Facturación',
  icono: 'factura',
  descripcion: 'Facturas de servicios y productos',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis facturas' : null),

  async render(contenedor, ctx) {
    const [accion] = ctx.parametros;
    if (accion === 'nueva') return renderNueva(contenedor, ctx);
    if (accion) return renderDetalle(contenedor, ctx, accion);
    return renderLista(contenedor, ctx);
  }
};

async function renderLista(contenedor, ctx) {
  const facturas = await get('/facturas');
  reemplazar(contenedor,
    encabezado(ctx.usuario.rol === 'cliente' ? 'Mis facturas' : 'Facturación', 'Facturas generadas con su detalle e impuestos.',
      PERSONAL.includes(ctx.usuario.rol) ? botonIcono('mas', 'Nueva factura', { class: 'accion', href: '#/facturas/nueva' }) : null
    ),
    h('div', { class: 'tarjeta' }, tabla([
      { titulo: 'Número', valor: (f) => h('a', { href: `#/facturas/${f.id}` }, h('strong', {}, f.numero)) },
      { titulo: 'Fecha', valor: (f) => fechaHora(f.creado_en) },
      { titulo: 'Cliente', valor: (f) => f.cliente_nombre },
      { titulo: 'Método de pago', valor: (f) => f.metodo_pago },
      { titulo: 'Total', clase: 'numero', valor: (f) => h('strong', {}, moneda(f.total)) },
      { titulo: 'Correo', valor: (f) => (f.enviada_en ? insignia('Enviada', 'exito') : insignia('Sin enviar')) }
    ], facturas, 'No hay facturas'))
  );
}

async function renderNueva(contenedor, ctx) {
  const [propietarios, productos, metodos] = await Promise.all([
    get('/propietarios'), get('/inventario/productos'), get('/facturas/metodos-pago')
  ]);
  const estado = { propietarioId: '', citas: [], seleccionCitas: new Set(), productos: [], servicios: [], metodoPago: '' };

  const zonaCitas = h('div', {}, h('p', { class: 'ayuda' }, 'Seleccione el cliente para ver los servicios atendidos pendientes de cobro.'));
  const zonaProductos = h('div', { style: 'display:flex;flex-direction:column;gap:0.5rem' });
  const zonaServicios = h('div', { style: 'display:flex;flex-direction:column;gap:0.5rem' });
  const resumen = h('div');

  const calcular = () => {
    const lineas = [];
    estado.citas.filter((c) => estado.seleccionCitas.has(c.id)).forEach((c) => lineas.push({ descripcion: `${c.servicio_nombre} - ${c.mascota_nombre}`, cantidad: 1, precio: c.costo, iva: IVA_SERVICIOS }));
    estado.productos.forEach((p) => {
      const producto = productos.find((x) => String(x.id) === String(p.productoId));
      if (producto && p.cantidad > 0) lineas.push({ descripcion: producto.nombre, cantidad: p.cantidad, precio: producto.precio_venta, iva: producto.iva_porcentaje });
    });
    estado.servicios.forEach((s) => {
      if (s.descripcion && s.precio > 0) lineas.push({ descripcion: s.descripcion, cantidad: 1, precio: s.precio, iva: IVA_SERVICIOS });
    });
    const subtotal = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
    const iva = lineas.reduce((a, l) => a + Math.round(l.precio * l.cantidad * l.iva / 100), 0);
    reemplazar(resumen, h('div', { class: 'tarjeta' },
      h('h2', {}, 'Resumen'),
      tabla([
        { titulo: 'Ítem', valor: (l) => `${l.descripcion} x${l.cantidad}` },
        { titulo: 'IVA', clase: 'numero', valor: (l) => `${l.iva} %` },
        { titulo: 'Total', clase: 'numero', valor: (l) => moneda(Math.round(l.precio * l.cantidad * (1 + l.iva / 100))) }
      ], lineas, 'Agregue servicios o productos'),
      listaDatos([['Subtotal', moneda(subtotal)], ['IVA', moneda(iva)], ['Total', h('strong', {}, moneda(subtotal + iva))]]),
      h('div', { class: 'campo', style: 'margin-top:1rem' },
        h('label', {}, 'Método de pago *'),
        h('div', { class: 'acciones' }, metodos.map((m) => h('label', { style: 'display:flex;gap:0.3rem;align-items:center' },
          h('input', { type: 'radio', name: 'metodoPago', value: m, checked: estado.metodoPago === m, style: 'width:auto', onChange: () => { estado.metodoPago = m; } }), m
        )))
      ),
      h('div', { class: 'acciones', style: 'margin-top:1rem' },
        h('button', { class: 'accion', disabled: !lineas.length || !estado.propietarioId, onClick: generar }, 'Generar factura')
      )
    ));
  };

  async function generar(evento) {
    const boton = evento.currentTarget;
    if (!estado.metodoPago) {
      aviso('Seleccione el método de pago', 'error');
      return;
    }
    boton.disabled = true;
    try {
      const items = [
        ...[...estado.seleccionCitas].map((citaId) => ({ tipo: 'cita', citaId })),
        ...estado.productos.filter((p) => p.productoId && p.cantidad > 0).map((p) => ({ tipo: 'producto', productoId: Number(p.productoId), cantidad: p.cantidad })),
        ...estado.servicios.filter((s) => s.descripcion && s.precio > 0).map((s) => ({ tipo: 'servicio', descripcion: s.descripcion, precio: s.precio }))
      ];
      const factura = await post('/facturas', { propietarioId: Number(estado.propietarioId), metodoPago: estado.metodoPago, items });
      aviso(`Factura ${factura.numero} generada`, 'exito');
      ctx.ir(`#/facturas/${factura.id}`);
    } catch (error) {
      aviso(error.message, 'error');
      boton.disabled = false;
    }
  }

  const seleccionarCliente = async (id) => {
    estado.propietarioId = id;
    estado.seleccionCitas.clear();
    estado.citas = id ? await get(`/facturas/por-facturar/${id}`) : [];
    reemplazar(zonaCitas, estado.citas.length
      ? estado.citas.map((c) => h('label', { style: 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem' },
        h('input', {
          type: 'checkbox',
          style: 'width:auto',
          onChange: (e) => { if (e.target.checked) estado.seleccionCitas.add(c.id); else estado.seleccionCitas.delete(c.id); calcular(); }
        }),
        `${c.servicio_nombre} · ${c.mascota_nombre} · ${c.fecha} ${c.hora} · ${moneda(c.costo)}`
      ))
      : h('p', { class: 'ayuda' }, id ? 'Este cliente no tiene servicios atendidos pendientes de cobro.' : 'Seleccione el cliente.'));
    calcular();
  };

  const agregarProducto = () => {
    const item = { productoId: '', cantidad: 1 };
    estado.productos.push(item);
    const fila = h('div', { class: 'acciones' },
      h('select', { 'aria-label': 'Producto', style: 'max-width:340px', onChange: (e) => { item.productoId = e.target.value; calcular(); } },
        h('option', { value: '' }, 'Seleccione el producto…'),
        productos.map((p) => h('option', { value: p.id, disabled: p.stock === 0 }, `${p.nombre} · ${moneda(p.precio_venta)} (stock ${p.stock})`))
      ),
      h('input', { type: 'number', min: '1', value: '1', 'aria-label': 'Cantidad', style: 'max-width:100px', onInput: (e) => { item.cantidad = Number(e.target.value); calcular(); } }),
      h('button', { type: 'button', class: 'fantasma icono-solo', 'aria-label': 'Quitar producto', onClick: () => { estado.productos.splice(estado.productos.indexOf(item), 1); fila.remove(); calcular(); } }, icono('cerrar', { tamano: 18 }))
    );
    zonaProductos.append(fila);
  };

  const agregarServicio = () => {
    const item = { descripcion: '', precio: 0 };
    estado.servicios.push(item);
    const fila = h('div', { class: 'acciones' },
      h('input', { placeholder: 'Procedimiento o servicio', 'aria-label': 'Descripción del servicio', style: 'max-width:340px', onInput: (e) => { item.descripcion = e.target.value.trim(); calcular(); } }),
      h('input', { type: 'number', min: '0', placeholder: 'Precio', 'aria-label': 'Precio', style: 'max-width:140px', onInput: (e) => { item.precio = Number(e.target.value); calcular(); } }),
      h('button', { type: 'button', class: 'fantasma icono-solo', 'aria-label': 'Quitar servicio', onClick: () => { estado.servicios.splice(estado.servicios.indexOf(item), 1); fila.remove(); calcular(); } }, icono('cerrar', { tamano: 18 }))
    );
    zonaServicios.append(fila);
  };

  reemplazar(contenedor,
    encabezado('Nueva factura', 'Servicios, procedimientos y productos consumidos por el cliente.',
      botonVolver('#/facturas')
    ),
    h('div', { class: 'rejilla-2' },
      h('div', { style: 'display:flex;flex-direction:column;gap:1rem' },
        h('div', { class: 'tarjeta' },
          h('div', { class: 'campo' },
            h('label', { for: 'factura-cliente' }, 'Cliente *'),
            h('select', { id: 'factura-cliente', onChange: (e) => seleccionarCliente(e.target.value) },
              h('option', { value: '' }, 'Seleccione el cliente…'),
              propietarios.map((p) => h('option', { value: p.id }, `${p.nombre} · ${p.documento}`))
            )
          )
        ),
        h('div', { class: 'tarjeta' }, h('h2', {}, 'Servicios atendidos'), zonaCitas),
        h('div', { class: 'tarjeta' },
          h('div', { class: 'titulo-pagina' }, h('h2', {}, 'Productos'), h('button', { type: 'button', class: 'secundario pequeno', onClick: agregarProducto }, '+ Producto')),
          h('p', { class: 'ayuda' }, 'Los productos vendidos se descuentan del inventario.'),
          zonaProductos
        ),
        h('div', { class: 'tarjeta' },
          h('div', { class: 'titulo-pagina' }, h('h2', {}, 'Otros servicios o procedimientos'), h('button', { type: 'button', class: 'secundario pequeno', onClick: agregarServicio }, '+ Servicio')),
          zonaServicios
        )
      ),
      resumen
    )
  );
  calcular();
}

async function renderDetalle(contenedor, ctx, id) {
  const f = await get(`/facturas/${id}`);
  const enviar = async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      await post(`/facturas/${f.id}/enviar`);
      aviso(`Factura enviada a ${f.cliente_correo}`, 'exito');
      ctx.recargar();
    } catch (error) {
      aviso(error.message, 'error');
      boton.disabled = false;
    }
  };

  reemplazar(contenedor,
    encabezado(`Factura ${f.numero}`, fechaHora(f.creado_en),
      botonVolver('#/facturas'),
      botonIcono('descargar', 'PDF', { class: 'secundario', href: `/api/facturas/${f.id}/pdf`, target: '_blank', rel: 'noopener' }),
      PERSONAL.includes(ctx.usuario.rol)
        ? h('button', { onClick: enviar }, icono('correo', { tamano: 18 }), f.enviada_en ? 'Reenviar al correo' : 'Enviar al correo del cliente')
        : null
    ),
    f.enviada_en ? h('div', { class: 'alerta info' }, `Enviada a ${f.cliente_correo} el ${fechaHora(f.enviada_en)}.`) : null,
    h('div', { class: 'tarjeta documento' },
      h('div', { class: 'cabecera-doc' },
        h('div', {}, h('h2', { style: 'color:var(--color-primario);margin:0' }, f.clinica.nombre),
          h('div', { class: 'ayuda' }, `NIT ${f.clinica.nit} · ${f.clinica.direccion} · ${f.clinica.telefono}`)),
        h('div', { style: 'text-align:right' }, h('strong', {}, `Factura ${f.numero}`), h('div', { class: 'ayuda' }, fechaHora(f.creado_en)))
      ),
      h('h3', {}, 'Cliente'),
      listaDatos([
        ['Nombre', f.cliente_nombre],
        ['Documento', f.cliente_documento],
        ['Dirección', f.cliente_direccion],
        ['Contacto', `${f.cliente_telefono} · ${f.cliente_correo}`]
      ]),
      h('h3', { style: 'margin-top:1rem' }, 'Detalle'),
      tabla([
        { titulo: 'Descripción', valor: (i) => i.descripcion },
        { titulo: 'Tipo', valor: (i) => i.tipo },
        { titulo: 'Cant.', clase: 'numero', valor: (i) => i.cantidad },
        { titulo: 'Valor unit.', clase: 'numero', valor: (i) => moneda(i.precio_unitario) },
        { titulo: 'Subtotal', clase: 'numero', valor: (i) => moneda(i.subtotal) },
        { titulo: 'IVA', clase: 'numero', valor: (i) => `${moneda(i.iva)} (${i.iva_porcentaje} %)` },
        { titulo: 'Total', clase: 'numero', valor: (i) => moneda(i.total) }
      ], f.items),
      h('div', { style: 'display:flex;justify-content:flex-end;margin-top:1rem' },
        listaDatos([
          ['Subtotal', moneda(f.subtotal)],
          ['IVA', moneda(f.iva)],
          ['Total pagado', h('strong', {}, moneda(f.total))],
          ['Método de pago', f.metodo_pago]
        ])
      )
    )
  );
}
