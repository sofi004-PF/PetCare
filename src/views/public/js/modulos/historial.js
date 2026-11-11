import { get, post } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, encabezado, fechaHora, insignia, archivoABase64 } from '../ui.js';

const COLOR_TIPO = {
  Consulta: 'info',
  Vacuna: 'exito',
  'Desparasitación': 'exito',
  'Archivo adjunto': '',
  Tratamiento: 'alerta',
  Receta: 'alerta'
};

/**
 * HU-02: Registro de historial clínico por paciente.
 * Búsqueda por nombre de la mascota o documento del dueño, línea de tiempo con
 * fecha, hora y veterinario de cada registro, y archivos adjuntos.
 */
export default {
  id: 'historial',
  titulo: 'Historial clínico',
  icono: '📋',
  descripcion: 'Expediente médico de cada paciente',

  async render(contenedor, ctx) {
    const buscador = h('input', {
      type: 'search',
      placeholder: ctx.usuario.rol === 'cliente' ? 'Buscar entre mis mascotas…' : 'Nombre de la mascota o documento del dueño…',
      'aria-label': 'Buscar paciente'
    });
    const resultados = h('div');
    const cargar = async () => {
      const mascotas = await get(`/mascotas?q=${encodeURIComponent(buscador.value.trim())}`);
      const filtradas = ctx.usuario.rol === 'cliente'
        ? mascotas.filter((m) => m.nombre.toLowerCase().includes(buscador.value.trim().toLowerCase()))
        : mascotas;
      reemplazar(resultados, tabla([
        { titulo: 'Mascota', valor: (m) => h('a', { href: `#/mascotas/${m.id}/historial` }, h('strong', {}, m.nombre)) },
        { titulo: 'Especie', valor: (m) => `${m.especie}${m.raza ? ` · ${m.raza}` : ''}` },
        { titulo: 'Propietario', valor: (m) => (m.propietarioNombre ? `${m.propietarioNombre} (${m.propietarioDocumento})` : '—') },
        { titulo: '', valor: (m) => h('a', { class: 'boton pequeno secundario', href: `#/mascotas/${m.id}/historial` }, 'Ver historial') }
      ], filtradas, 'No se encontraron pacientes'));
    };
    let temporizador;
    buscador.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(cargar, 250); });

    reemplazar(contenedor,
      encabezado('Historial clínico', 'Busque al paciente por el nombre de la mascota o el documento de identidad del dueño.'),
      h('div', { class: 'tarjeta' }, h('div', { class: 'barra-filtros', style: 'margin-bottom:1rem' }, buscador), resultados)
    );
    buscador.focus();
    await cargar();
  }
};

/**
 * Pestaña "Historial" de la ficha de la mascota: línea de tiempo y archivos.
 */
export const pestanaHistorial = {
  id: 'historial',
  titulo: 'Historial clínico',
  visible: (ctx) => ctx.puede('historial'),
  async render(contenedor, mascota, ctx) {
    const [{ eventos, archivos }, tipos] = await Promise.all([get(`/historial/${mascota.id}`), get('/historial/tipos')]);
    const esVeterinario = ctx.usuario.rol === 'veterinario';

    const nuevaEntrada = () => {
      const modal = abrirModal('Nueva entrada en el historial', [
        h('p', { class: 'ayuda' }, `Se registrará con la fecha y hora actuales a nombre de ${ctx.usuario.nombre}.`),
        formulario([
          { nombre: 'tipo', etiqueta: 'Tipo de registro', tipo: 'select', requerido: true, opciones: tipos.map((t) => ({ valor: t, texto: t })) },
          { nombre: 'titulo', etiqueta: 'Título', requerido: true, placeholder: 'Ej: Vacuna antirrábica' },
          { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: 'completo' }
        ], async (datos) => {
          await post(`/historial/${mascota.id}/entradas`, datos);
          aviso('Entrada agregada al historial', 'exito');
          modal.cerrar();
          ctx.recargar();
        })
      ]);
    };

    const adjuntar = () => {
      const modal = abrirModal('Adjuntar archivo', [
        h('p', { class: 'ayuda' }, 'Resultados de rayos X, exámenes de laboratorio u otros documentos. PDF o imagen, máximo 10 MB.'),
        formulario([
          { nombre: 'archivo', etiqueta: 'Archivo', tipo: 'file', requerido: true, accept: '.pdf,image/png,image/jpeg,image/gif,image/webp', ancho: 'completo' },
          { nombre: 'descripcion', etiqueta: 'Descripción', placeholder: 'Ej: Radiografía de tórax', ancho: 'completo' }
        ], async (datos) => {
          if (!datos.archivo) throw new Error('Seleccione un archivo');
          if (datos.archivo.size > 10 * 1024 * 1024) throw new Error('El archivo supera los 10 MB');
          await post(`/historial/${mascota.id}/archivos`, {
            nombre: datos.archivo.name,
            tipoMime: datos.archivo.type,
            contenidoBase64: await archivoABase64(datos.archivo),
            descripcion: datos.descripcion
          });
          aviso('Archivo adjuntado', 'exito');
          modal.cerrar();
          ctx.recargar();
        }, { textoBoton: 'Adjuntar' })
      ]);
    };

    reemplazar(contenedor,
      h('div', { class: 'rejilla-2' },
        h('div', { class: 'tarjeta' },
          h('div', { class: 'titulo-pagina' },
            h('h2', {}, 'Línea de tiempo clínica'),
            esVeterinario ? h('button', { class: 'pequeno', onClick: nuevaEntrada }, '+ Nueva entrada') : null
          ),
          eventos.length
            ? h('div', { class: 'linea-tiempo' }, eventos.map((e) => h('div', { class: 'evento' },
              insignia(e.tipo, COLOR_TIPO[e.tipo] ?? ''), ' ', h('strong', {}, e.titulo),
              h('div', { class: 'meta' }, `${fechaHora(e.fecha)}${e.autor ? ` · ${e.autor}` : ''}`),
              e.detalle ? h('p', { style: 'white-space:pre-line;margin:0.25rem 0 0' }, e.detalle) : null,
              e.archivoId ? h('a', { href: `/api/historial/archivos/${e.archivoId}`, target: '_blank', rel: 'noopener' }, 'Abrir archivo') : null
            )))
            : h('p', { class: 'vacio' }, 'El historial clínico aún está vacío.')
        ),
        h('div', { class: 'tarjeta' },
          h('div', { class: 'titulo-pagina' },
            h('h2', {}, `Archivos adjuntos (${archivos.length})`),
            esVeterinario ? h('button', { class: 'pequeno secundario', onClick: adjuntar }, '📎 Adjuntar') : null
          ),
          tabla([
            { titulo: 'Archivo', valor: (a) => h('a', { href: `/api/historial/archivos/${a.id}`, target: '_blank', rel: 'noopener' }, a.nombre) },
            { titulo: 'Descripción', valor: (a) => a.descripcion || '—' },
            { titulo: 'Subido', valor: (a) => `${fechaHora(a.creadoEn)} · ${a.veterinarioNombre}` },
            { titulo: 'Tamaño', clase: 'numero', valor: (a) => `${(a.tamano / 1024).toFixed(0)} KB` }
          ], archivos, 'Sin archivos adjuntos')
        )
      )
    );
  }
};
