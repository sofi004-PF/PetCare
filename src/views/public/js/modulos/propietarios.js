import { get, post, put } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, encabezado, listaDatos, fecha, insignia } from '../ui.js';

const PUEDEN_EDITAR = ['administrador', 'recepcionista'];

/**
 * HU-07: Registro y gestión de propietarios y sus mascotas.
 * El personal administra a todos los propietarios; el cliente ve su propia ficha.
 */
export default {
  id: 'propietarios',
  titulo: 'Propietarios',
  icono: '🧑‍🤝‍🧑',
  descripcion: 'Dueños y sus mascotas',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis mascotas' : null),

  async render(contenedor, ctx) {
    if (ctx.usuario.rol === 'cliente') {
      return renderDetalle(contenedor, ctx, ctx.usuario.propietarioId);
    }
    if (ctx.parametros[0]) {
      return renderDetalle(contenedor, ctx, ctx.parametros[0]);
    }
    return renderLista(contenedor, ctx);
  }
};

async function renderLista(contenedor, ctx) {
  const resultados = h('div');
  const buscador = h('input', { type: 'search', placeholder: 'Buscar por nombre o documento…', 'aria-label': 'Buscar propietario' });

  const cargar = async () => {
    const propietarios = await get(`/propietarios?q=${encodeURIComponent(buscador.value.trim())}`);
    reemplazar(resultados, tabla([
      { titulo: 'Nombre', valor: (p) => h('a', { href: `#/propietarios/${p.id}` }, h('strong', {}, p.nombre)) },
      { titulo: 'Documento', valor: (p) => p.documento },
      { titulo: 'Teléfono', valor: (p) => p.telefono },
      { titulo: 'Correo', valor: (p) => p.correo },
      { titulo: 'Mascotas', valor: (p) => (p.mascotas.length ? p.mascotas.map((m) => m.nombre).join(', ') : insignia('Sin mascotas')) }
    ], propietarios, 'No se encontraron propietarios'));
  };

  let temporizador;
  buscador.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(cargar, 250);
  });

  reemplazar(contenedor,
    encabezado('Propietarios', 'Datos de contacto de los dueños y sus mascotas.',
      PUEDEN_EDITAR.includes(ctx.usuario.rol) ? h('button', { onClick: () => abrirRegistro(ctx) }, '+ Nuevo propietario') : null
    ),
    h('div', { class: 'tarjeta' }, h('div', { class: 'barra-filtros', style: 'margin-bottom:1rem' }, buscador), resultados)
  );
  await cargar();
}

function abrirRegistro(ctx) {
  const modal = abrirModal('Nuevo propietario', formulario([
    { nombre: 'nombre', etiqueta: 'Nombre completo', requerido: true },
    { nombre: 'documento', etiqueta: 'Documento de identidad', requerido: true },
    { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', requerido: true },
    { nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', requerido: true },
    { nombre: 'direccion', etiqueta: 'Dirección', requerido: true, ancho: 'completo' },
    { nombre: 'crearAcceso', etiqueta: 'Crear acceso a la página para el cliente', tipo: 'checkbox', ayuda: 'Podrá agendar citas y ver sus mascotas con su correo.' },
    { nombre: 'password', etiqueta: 'Contraseña del cliente', tipo: 'password', ayuda: 'Solo si crea el acceso. Mínimo 8 caracteres.' }
  ], async (datos) => {
    const propietario = await post('/propietarios', datos);
    aviso('Propietario registrado', 'exito');
    modal.cerrar();
    ctx.ir(`#/propietarios/${propietario.id}`);
  }));
}

async function renderDetalle(contenedor, ctx, id) {
  if (!id) {
    reemplazar(contenedor, h('div', { class: 'alerta info' }, 'Su usuario no está asociado a un propietario. Comuníquese con la clínica.'));
    return;
  }
  const [propietario, especies] = await Promise.all([get(`/propietarios/${id}`), get('/propietarios/especies')]);
  const esCliente = ctx.usuario.rol === 'cliente';
  const puedeEditar = PUEDEN_EDITAR.includes(ctx.usuario.rol);

  const editar = () => {
    const modal = abrirModal('Editar propietario', formulario([
      { nombre: 'nombre', etiqueta: 'Nombre completo', requerido: true, valor: propietario.nombre },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', requerido: true, valor: propietario.telefono },
      { nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', requerido: true, valor: propietario.correo },
      { nombre: 'direccion', etiqueta: 'Dirección', requerido: true, valor: propietario.direccion, ancho: 'completo' }
    ], async (datos) => {
      await put(`/propietarios/${propietario.id}`, datos);
      aviso('Datos actualizados', 'exito');
      modal.cerrar();
      ctx.recargar();
    }));
  };

  const agregarMascota = () => {
    const modal = abrirModal('Asociar mascota', formularioMascota(especies, {}, async (datos) => {
      await post(`/propietarios/${propietario.id}/mascotas`, datos);
      aviso('Mascota asociada', 'exito');
      modal.cerrar();
      ctx.recargar();
    }));
  };

  reemplazar(contenedor,
    encabezado(esCliente ? 'Mis datos y mascotas' : propietario.nombre, esCliente ? propietario.nombre : `Documento ${propietario.documento}`,
      esCliente ? null : h('a', { class: 'boton secundario', href: '#/propietarios' }, '← Volver'),
      puedeEditar ? h('button', { class: 'secundario', onClick: editar }, 'Editar datos') : null
    ),
    h('div', { class: 'rejilla-2' },
      h('div', { class: 'tarjeta' },
        h('h2', {}, 'Datos de contacto'),
        listaDatos([
          ['Documento', propietario.documento],
          ['Teléfono', propietario.telefono],
          ['Correo', propietario.correo],
          ['Dirección', propietario.direccion],
          ['Registrado', fecha(propietario.creadoEn)]
        ])
      ),
      h('div', { class: 'tarjeta' },
        h('div', { class: 'titulo-pagina' },
          h('h2', {}, `Mascotas (${propietario.mascotas.length})`),
          puedeEditar || esCliente ? h('button', { class: 'pequeno', onClick: agregarMascota }, '+ Asociar mascota') : null
        ),
        tabla([
          { titulo: 'Nombre', valor: (m) => h('a', { href: `#/mascotas/${m.id}` }, h('strong', {}, m.nombre)) },
          { titulo: 'Especie', valor: (m) => m.especie },
          { titulo: 'Raza', valor: (m) => m.raza || '—' },
          { titulo: 'Sexo', valor: (m) => m.sexo || '—' },
          { titulo: 'Nacimiento', valor: (m) => fecha(m.fechaNacimiento) }
        ], propietario.mascotas, 'Este propietario aún no tiene mascotas asociadas')
      )
    )
  );
}

/**
 * Formulario de datos de una mascota (crear o editar).
 * @param {Array<string>} especies - Especies disponibles.
 * @param {Object} mascota - Valores actuales.
 * @param {Function} alGuardar - Acción al enviar.
 * @returns {HTMLFormElement} Formulario.
 */
export function formularioMascota(especies, mascota, alGuardar) {
  return formulario([
    { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, valor: mascota.nombre },
    { nombre: 'especie', etiqueta: 'Especie', tipo: 'select', requerido: true, placeholder: 'Seleccione…', opciones: especies.map((e) => ({ valor: e, texto: e })), valor: mascota.especie },
    { nombre: 'raza', etiqueta: 'Raza', valor: mascota.raza },
    { nombre: 'sexo', etiqueta: 'Sexo', tipo: 'select', placeholder: 'Sin especificar', opciones: [{ valor: 'Macho', texto: 'Macho' }, { valor: 'Hembra', texto: 'Hembra' }], valor: mascota.sexo },
    { nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'date', valor: mascota.fechaNacimiento }
  ], alGuardar);
}
