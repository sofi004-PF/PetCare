import { get, post } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, encabezado, fecha, fechaHora, insignia, archivoABase64, avatarEspecie, nuevoId, botonIcono } from '../ui.js';
import { icono, grupoEspecie } from '../iconos.js';
import { tarjetaRecordatoriosMascota } from './recordatorios.js';

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
/** Filtros por tipo de mascota. */
const FILTROS_ESPECIE = [
  { id: 'todos', texto: 'Todos' },
  { id: 'perros', texto: 'Perros' },
  { id: 'gatos', texto: 'Gatos' },
  { id: 'exoticos', texto: 'Exóticos' }
];

export default {
  id: 'historial',
  titulo: 'Pacientes',
  icono: 'expediente',
  descripcion: 'Historial clínico de cada mascota',
  tituloPara: (rol) => (rol === 'cliente' ? 'Historial clínico' : null),

  async render(contenedor, ctx) {
    const idBuscador = nuevoId('buscar');
    const buscador = h('input', {
      id: idBuscador,
      type: 'search',
      autocomplete: 'off',
      placeholder: ctx.usuario.rol === 'cliente' ? 'Nombre de la mascota' : 'Mascota o documento del dueño'
    });
    const resultados = h('div', { 'aria-live': 'polite' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por tipo de mascota' });
    let mascotas = [];
    let filtro = 'todos';

    const pintar = () => {
      const conteos = { todos: mascotas.length, perros: 0, gatos: 0, exoticos: 0 };
      mascotas.forEach((m) => { conteos[grupoEspecie(m.especie)] += 1; });
      reemplazar(chips, FILTROS_ESPECIE.map((f) => h('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(filtro === f.id),
        onClick: () => { filtro = f.id; pintar(); }
      }, f.texto, h('span', { class: 'conteo' }, String(conteos[f.id])))));

      const visibles = filtro === 'todos' ? mascotas : mascotas.filter((m) => grupoEspecie(m.especie) === filtro);
      reemplazar(resultados, tabla([
        {
          titulo: 'Paciente',
          valor: (m) => h('a', { class: 'celda-paciente', href: `#/mascotas/${m.id}/historial` },
            avatarEspecie(m.especie), h('strong', {}, m.nombre))
        },
        { titulo: 'Especie', valor: (m) => `${m.especie}${m.raza ? ` · ${m.raza}` : ''}` },
        { titulo: 'Sexo', valor: (m) => m.sexo || '—' },
        { titulo: 'Nacimiento', valor: (m) => fecha(m.fechaNacimiento) },
        { titulo: 'Propietario', valor: (m) => (m.propietarioNombre ? `${m.propietarioNombre} · ${m.propietarioDocumento}` : '—') },
        { titulo: '', valor: (m) => h('a', { class: 'boton pequeno secundario', href: `#/mascotas/${m.id}/historial` }, 'Ver historial') }
      ], visibles, buscador.value.trim()
        ? `Ningún paciente coincide con "${buscador.value.trim()}". Revise el nombre o el documento.`
        : 'No hay pacientes de este tipo.'));
    };

    const cargar = async () => {
      const texto = buscador.value.trim().toLowerCase();
      const lista = await get(`/mascotas?q=${encodeURIComponent(buscador.value.trim())}`);
      mascotas = ctx.usuario.rol === 'cliente' ? lista.filter((m) => m.nombre.toLowerCase().includes(texto)) : lista;
      pintar();
    };
    let temporizador;
    buscador.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(cargar, 250); });

    reemplazar(contenedor,
      encabezado(ctx.usuario.rol === 'cliente' ? 'Historial clínico' : 'Pacientes', 'Busque una mascota para abrir su historial clínico.'),
      h('div', { class: 'tarjeta', style: 'display:flex;flex-direction:column;gap:1rem' },
        h('div', { class: 'barra-filtros' },
          h('div', { class: 'campo campo-busqueda' },
            h('label', { for: idBuscador }, 'Buscar paciente'),
            h('div', { class: 'buscador' }, icono('buscar', { tamano: 18 }), buscador)
          )
        ),
        chips,
        resultados
      )
    );
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
    const [{ eventos, archivos }, tipos, recordatorios] = await Promise.all([
      get(`/historial/${mascota.id}`), get('/historial/tipos'), tarjetaRecordatoriosMascota(mascota, ctx)
    ]);
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
        recordatorios,
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
            esVeterinario ? botonIcono('clip', 'Adjuntar', { class: 'pequeno secundario', onClick: adjuntar }) : null
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
